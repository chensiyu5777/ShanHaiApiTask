import fs from 'fs';
import path from 'path';
import https from 'https';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { setProgress, getProgress, deleteProgress } from './install-progress-store';

const execAsync = promisify(exec);

export interface InstallProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  progress: number;
  status: 'idle' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'error';
  error?: string;
}

export interface DatabaseInstallRequest {
  databaseType: 'postgresql' | 'mysql' | 'sqlite3';
  version: string;
  downloadUrl: string;
  installPath?: string;
}

class DatabaseInstaller {
  private static instance: DatabaseInstaller;
  private downloadPath = path.join(process.cwd(), 'temp', 'downloads');

  private constructor() {
    // 确保下载目录存在
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  static getInstance(): DatabaseInstaller {
    if (!DatabaseInstaller.instance) {
      DatabaseInstaller.instance = new DatabaseInstaller();
    }
    return DatabaseInstaller.instance;
  }

  async startInstall(installId: string, request: DatabaseInstallRequest): Promise<void> {
    const initialProgress: InstallProgress = {
      step: 0,
      totalSteps: 5,
      currentStep: '准备开始安装',
      progress: 0,
      status: 'downloading'
    };

    setProgress(installId, initialProgress);
    console.log(`Starting real install for ID: ${installId}`, initialProgress);

    try {
      // 步骤1：检查系统环境和管理员权限
      await this.checkSystemRequirements(installId, request.databaseType);
      
      // 步骤2：下载安装包
      const installerPath = await this.downloadInstaller(installId, request);
      
      // 步骤3：安装数据库驱动
      await this.installDatabaseDrivers(installId, request.databaseType);
      
      // 步骤4：执行数据库安装
      await this.executeRealInstaller(installId, request.databaseType, installerPath);
      
      // 步骤5：配置和启动服务
      await this.configureService(installId, request.databaseType);
      
      // 完成安装
      this.updateProgress(installId, {
        step: 5,
        totalSteps: 5,
        currentStep: '安装完成',
        progress: 100,
        status: 'completed'
      });

      console.log(`Real install completed for ID: ${installId}`);

    } catch (error) {
      console.error(`Real install failed for ID: ${installId}`, error);
      this.updateProgress(installId, {
        step: 0,
        totalSteps: 5,
        currentStep: '安装失败',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : '未知安装错误'
      });
    }
  }

  private async checkSystemRequirements(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 1,
      totalSteps: 5,
      currentStep: '检查系统环境和权限',
      progress: 5,
      status: 'downloading'
    });

    // 检查操作系统
    if (process.platform !== 'win32') {
      throw new Error('当前只支持 Windows 系统自动安装');
    }

    // 检查管理员权限
    try {
      await execAsync('net session', { timeout: 5000 });
    } catch (error) {
      throw new Error('需要管理员权限才能安装数据库。请以管理员身份运行此应用程序。');
    }

    // 检查是否已安装
    const isInstalled = await this.checkIfInstalled(dbType);
    if (isInstalled) {
      throw new Error(`${dbType} 已经安装，无需重复安装`);
    }

    // 检查磁盘空间（至少需要2GB）
    const freeSpace = await this.checkDiskSpace();
    if (freeSpace < 2048) {
      throw new Error('磁盘空间不足，至少需要2GB可用空间');
    }

    this.updateProgress(installId, {
      step: 1,
      totalSteps: 5,
      currentStep: '系统环境检查完成',
      progress: 10,
      status: 'downloading'
    });
  }

  private async checkIfInstalled(dbType: string): Promise<boolean> {
    try {
      if (dbType === 'postgresql') {
        await execAsync('pg_config --version', { timeout: 3000 });
        return true;
      } else if (dbType === 'mysql') {
        await execAsync('mysql --version', { timeout: 3000 });
        return true;
      }
    } catch (error) {
      // 未找到命令，说明未安装
    }
    return false;
  }

  private async downloadInstaller(installId: string, request: DatabaseInstallRequest): Promise<string> {
    this.updateProgress(installId, {
      step: 2,
      totalSteps: 5,
      currentStep: '开始下载安装包...',
      progress: 15,
      status: 'downloading'
    });

    const fileName = this.getInstallerFileName(request.databaseType, request.version);
    const filePath = path.join(this.downloadPath, fileName);

    // 检查文件是否已存在，避免重复下载
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 1024 * 1024) { // 大于1MB认为是有效文件
        this.updateProgress(installId, {
          step: 2,
          totalSteps: 5,
          currentStep: '安装包已存在，跳过下载',
          progress: 30,
          status: 'downloading'
        });
        return filePath;
      }
    }

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      let downloadedBytes = 0;
      let totalBytes = 0;

      const httpsRequest = https.get(request.downloadUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // 处理重定向
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, (redirectResponse) => {
              this.handleRealDownload(redirectResponse, file, installId, resolve, reject, filePath);
            }).on('error', reject);
          } else {
            reject(new Error('重定向URL为空'));
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${response.statusCode}`));
          return;
        }

        this.handleRealDownload(response, file, installId, resolve, reject, filePath);
      });

      httpsRequest.setTimeout(300000); // 5分钟超时
      httpsRequest.on('timeout', () => {
        httpsRequest.destroy();
        reject(new Error('下载超时'));
      });
      httpsRequest.on('error', reject);
    });
  }

  private handleRealDownload(
    response: any,
    file: fs.WriteStream,
    installId: string,
    resolve: (value: string) => void,
    reject: (reason: any) => void,
    filePath: string
  ) {
    const totalBytes = parseInt(response.headers['content-length'] || '0');
    let downloadedBytes = 0;

    response.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      file.write(chunk);
      
      if (totalBytes > 0) {
        const progress = 15 + Math.round((downloadedBytes / totalBytes) * 15); // 15-30%
        this.updateProgress(installId, {
          step: 2,
          totalSteps: 5,
          currentStep: `下载进度: ${Math.round((downloadedBytes / totalBytes) * 100)}%`,
          progress,
          status: 'downloading'
        });
      }
    });

    response.on('end', () => {
      file.end();
      this.updateProgress(installId, {
        step: 2,
        totalSteps: 5,
        currentStep: '下载完成',
        progress: 30,
        status: 'downloading'
      });
      resolve(filePath);
    });

    response.on('error', (error: Error) => {
      file.destroy();
      fs.unlinkSync(filePath); // 删除不完整文件
      reject(error);
    });
  }

  private async executeRealInstaller(installId: string, dbType: string, installerPath: string): Promise<void> {
    this.updateProgress(installId, {
      step: 4,
      totalSteps: 5,
      currentStep: `启动 ${dbType} 安装程序`,
      progress: 50,
      status: 'installing'
    });

    try {
      let installCommand: string;
      let installArgs: string[];

      if (dbType === 'postgresql') {
        installCommand = installerPath;
        installArgs = [
          '--mode', 'unattended',
          '--unattendedmodeui', 'minimal',
          '--superpassword', 'postgres123',
          '--servicename', 'postgresql',
          '--servicepassword', 'postgres123',
          '--serverport', '5432'
        ];
      } else if (dbType === 'mysql') {
        installCommand = 'msiexec';
        installArgs = [
          '/i', installerPath,
          '/quiet',
          'INSTALLDIR=C:\\Program Files\\MySQL\\MySQL Server 8.0\\',
          'DATADIR=C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data\\',
          'SERVICENAME=MySQL80'
        ];
      } else if (dbType === 'sqlite3') {
        // SQLite3 只需要复制文件到系统路径
        const systemPath = 'C:\\Windows\\System32';
        const targetPath = path.join(systemPath, 'sqlite3.exe');
        fs.copyFileSync(installerPath, targetPath);
        
        this.updateProgress(installId, {
          step: 4,
          totalSteps: 5,
          currentStep: 'SQLite3 安装完成',
          progress: 80,
          status: 'configuring'
        });
        return;
      } else {
        throw new Error(`不支持的数据库类型: ${dbType}`);
      }

      this.updateProgress(installId, {
        step: 4,
        totalSteps: 5,
        currentStep: `正在安装 ${dbType}，请等待...`,
        progress: 60,
        status: 'installing'
      });

      // 执行安装命令
      const installProcess = spawn(installCommand, installArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let installOutput = '';
      installProcess.stdout?.on('data', (data) => {
        installOutput += data.toString();
        console.log(`[${dbType} Install]`, data.toString());
      });

      installProcess.stderr?.on('data', (data) => {
        installOutput += data.toString();
        console.error(`[${dbType} Install Error]`, data.toString());
      });

      // 等待安装完成
      const exitCode = await new Promise<number>((resolve) => {
        installProcess.on('close', resolve);
      });

      if (exitCode !== 0) {
        throw new Error(`安装失败，退出代码: ${exitCode}\n${installOutput}`);
      }

      this.updateProgress(installId, {
        step: 4,
        totalSteps: 5,
        currentStep: `${dbType} 安装完成`,
        progress: 80,
        status: 'configuring'
      });

    } catch (error) {
      throw new Error(`安装 ${dbType} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async configureService(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 5,
      totalSteps: 5,
      currentStep: '配置和启动数据库服务',
      progress: 85,
      status: 'configuring'
    });

    try {
      if (dbType === 'postgresql') {
        // 启动PostgreSQL服务
        await execAsync('net start postgresql-x64-15', { timeout: 30000 });
        
        // 等待服务完全启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查服务状态
        const serviceStatus = await execAsync('sc query postgresql-x64-15');
        if (!serviceStatus.stdout.includes('RUNNING')) {
          throw new Error('PostgreSQL服务启动失败');
        }
      } else if (dbType === 'mysql') {
        // 启动MySQL服务
        await execAsync('net start MySQL80', { timeout: 30000 });
        
        // 等待服务完全启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查服务状态
        const serviceStatus = await execAsync('sc query MySQL80');
        if (!serviceStatus.stdout.includes('RUNNING')) {
          throw new Error('MySQL服务启动失败');
        }
      } else if (dbType === 'sqlite3') {
        // SQLite3不需要服务，只需要检查是否可用
        await execAsync('sqlite3 --version', { timeout: 5000 });
      }

      this.updateProgress(installId, {
        step: 5,
        totalSteps: 5,
        currentStep: `${dbType} 服务配置完成`,
        progress: 95,
        status: 'configuring'
      });

    } catch (error) {
      throw new Error(`配置 ${dbType} 服务失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private updateProgress(installId: string, progress: Partial<InstallProgress>) {
    const current = getProgress(installId);
    const updated = current ? { ...current, ...progress } : {
      step: 0,
      totalSteps: 4,
      currentStep: '更新中',
      progress: 0,
      status: 'downloading' as const,
      ...progress
    };
    
    setProgress(installId, updated);
    console.log(`Updated progress for ${installId}:`, updated);
  }

  getProgress(installId: string): InstallProgress | null {
    return getProgress(installId);
  }

  clearProgress(installId: string): void {
    deleteProgress(installId);
  }

  // 新增：安装数据库驱动
  private async installDatabaseDrivers(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 3,
      totalSteps: 5,
      currentStep: '安装数据库驱动',
      progress: 35,
      status: 'installing'
    });

    try {
      if (dbType === 'postgresql') {
        // 安装PostgreSQL Node.js驱动
        await execAsync('npm install pg @types/pg', { 
          cwd: process.cwd(),
          timeout: 60000 
        });
      } else if (dbType === 'mysql') {
        // 安装MySQL Node.js驱动
        await execAsync('npm install mysql2', { 
          cwd: process.cwd(),
          timeout: 60000 
        });
      } else if (dbType === 'sqlite3') {
        // 安装SQLite3 Node.js驱动
        await execAsync('npm install sqlite3 @types/sqlite3', { 
          cwd: process.cwd(),
          timeout: 60000 
        });
      }

      this.updateProgress(installId, {
        step: 3,
        totalSteps: 5,
        currentStep: '数据库驱动安装完成',
        progress: 45,
        status: 'installing'
      });

    } catch (error) {
      throw new Error(`安装 ${dbType} 驱动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 新增：获取安装包文件名
  private getInstallerFileName(dbType: string, version: string): string {
    switch (dbType) {
      case 'postgresql':
        return `postgresql-${version}-windows-x64.exe`;
      case 'mysql':
        return `mysql-installer-community-${version}.msi`;
      case 'sqlite3':
        return `sqlite3-tools-win32-x86.zip`;
      default:
        throw new Error(`不支持的数据库类型: ${dbType}`);
    }
  }

  // 新增：检查磁盘空间
  private async checkDiskSpace(): Promise<number> {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
      const lines = stdout.trim().split('\n').slice(1); // 跳过标题行
      
      // 获取C盘的可用空间
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[0] === 'C:') {
          const freeSpaceBytes = parseInt(parts[1]);
          return Math.floor(freeSpaceBytes / (1024 * 1024)); // 转换为MB
        }
      }
      
      return 0; // 如果无法获取，返回0
    } catch (error) {
      console.warn('无法检查磁盘空间:', error);
      return 0;
    }
  }

  // 新增：卸载数据库
  async uninstallDatabase(installId: string, dbType: string): Promise<void> {
    const initialProgress: InstallProgress = {
      step: 0,
      totalSteps: 4,
      currentStep: '准备卸载数据库',
      progress: 0,
      status: 'downloading'
    };

    setProgress(installId, initialProgress);
    console.log(`Starting uninstall for ID: ${installId}, DB: ${dbType}`);

    try {
      // 步骤1：停止服务
      await this.stopDatabaseService(installId, dbType);
      
      // 步骤2：卸载软件
      await this.uninstallDatabaseSoftware(installId, dbType);
      
      // 步骤3：清理驱动
      await this.uninstallDatabaseDrivers(installId, dbType);
      
      // 步骤4：清理文件和注册表
      await this.cleanupDatabaseFiles(installId, dbType);
      
      // 完成卸载
      this.updateProgress(installId, {
        step: 4,
        totalSteps: 4,
        currentStep: '卸载完成',
        progress: 100,
        status: 'completed'
      });

      console.log(`Uninstall completed for ID: ${installId}`);

    } catch (error) {
      console.error(`Uninstall failed for ID: ${installId}`, error);
      this.updateProgress(installId, {
        step: 0,
        totalSteps: 4,
        currentStep: '卸载失败',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : '未知卸载错误'
      });
    }
  }

  // 停止数据库服务
  private async stopDatabaseService(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 1,
      totalSteps: 4,
      currentStep: '停止数据库服务',
      progress: 10,
      status: 'downloading'
    });

    try {
      if (dbType === 'postgresql') {
        await execAsync('net stop postgresql-x64-15', { timeout: 30000 });
      } else if (dbType === 'mysql') {
        await execAsync('net stop MySQL80', { timeout: 30000 });
      }
    } catch (error) {
      // 服务可能已经停止，忽略错误
      console.warn(`停止 ${dbType} 服务时出现警告:`, error);
    }

    this.updateProgress(installId, {
      step: 1,
      totalSteps: 4,
      currentStep: '数据库服务已停止',
      progress: 25,
      status: 'downloading'
    });
  }

  // 卸载数据库软件
  private async uninstallDatabaseSoftware(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 2,
      totalSteps: 4,
      currentStep: '卸载数据库软件',
      progress: 30,
      status: 'installing'
    });

    try {
      if (dbType === 'postgresql') {
        // PostgreSQL 卸载
        const uninstallPath = 'C:\\Program Files\\PostgreSQL\\15\\uninstall-postgresql.exe';
        if (fs.existsSync(uninstallPath)) {
          await execAsync(`"${uninstallPath}" --mode unattended`, { timeout: 120000 });
        }
      } else if (dbType === 'mysql') {
        // MySQL 卸载
        await execAsync('wmic product where "name like \'MySQL%\'" call uninstall', { timeout: 120000 });
      } else if (dbType === 'sqlite3') {
        // SQLite3 只需要删除exe文件
        const sqlitePath = 'C:\\Windows\\System32\\sqlite3.exe';
        if (fs.existsSync(sqlitePath)) {
          fs.unlinkSync(sqlitePath);
        }
      }

      this.updateProgress(installId, {
        step: 2,
        totalSteps: 4,
        currentStep: '数据库软件已卸载',
        progress: 50,
        status: 'installing'
      });

    } catch (error) {
      throw new Error(`卸载 ${dbType} 软件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 卸载数据库驱动
  private async uninstallDatabaseDrivers(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 3,
      totalSteps: 4,
      currentStep: '卸载数据库驱动',
      progress: 60,
      status: 'configuring'
    });

    try {
      if (dbType === 'postgresql') {
        await execAsync('npm uninstall pg @types/pg', { 
          cwd: process.cwd(),
          timeout: 60000 
        });
      } else if (dbType === 'mysql') {
        await execAsync('npm uninstall mysql2', { 
          cwd: process.cwd(),
          timeout: 60000 
        });
      } else if (dbType === 'sqlite3') {
        await execAsync('npm uninstall sqlite3 @types/sqlite3', { 
          cwd: process.cwd(),
          timeout: 60000 
        });
      }

      this.updateProgress(installId, {
        step: 3,
        totalSteps: 4,
        currentStep: '数据库驱动已卸载',
        progress: 75,
        status: 'configuring'
      });

    } catch (error) {
      console.warn(`卸载 ${dbType} 驱动时出现警告:`, error);
    }
  }

  // 清理数据库文件
  private async cleanupDatabaseFiles(installId: string, dbType: string): Promise<void> {
    this.updateProgress(installId, {
      step: 4,
      totalSteps: 4,
      currentStep: '清理数据库文件',
      progress: 80,
      status: 'configuring'
    });

    try {
      if (dbType === 'postgresql') {
        // 清理PostgreSQL数据目录
        const dataDir = 'C:\\Program Files\\PostgreSQL\\15\\data';
        if (fs.existsSync(dataDir)) {
          await execAsync(`rmdir /s /q "${dataDir}"`, { timeout: 30000 });
        }
        
        // 清理程序文件夹
        const programDir = 'C:\\Program Files\\PostgreSQL';
        if (fs.existsSync(programDir)) {
          await execAsync(`rmdir /s /q "${programDir}"`, { timeout: 30000 });
        }
      } else if (dbType === 'mysql') {
        // 清理MySQL数据目录
        const dataDir = 'C:\\ProgramData\\MySQL';
        if (fs.existsSync(dataDir)) {
          await execAsync(`rmdir /s /q "${dataDir}"`, { timeout: 30000 });
        }
        
        // 清理程序文件夹
        const programDir = 'C:\\Program Files\\MySQL';
        if (fs.existsSync(programDir)) {
          await execAsync(`rmdir /s /q "${programDir}"`, { timeout: 30000 });
        }
      }

      this.updateProgress(installId, {
        step: 4,
        totalSteps: 4,
        currentStep: '清理完成',
        progress: 95,
        status: 'configuring'
      });

    } catch (error) {
      console.warn(`清理 ${dbType} 文件时出现警告:`, error);
    }
  }
}

export const databaseInstaller = DatabaseInstaller.getInstance();