import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          全栈管理平台
        </h1>
        
        <p className="text-gray-600 text-center mb-8">
          高度可定制的数据库管理和API服务平台
        </p>
        
        <div className="space-y-4">
          <Link
            href="/admin"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg transition-colors"
          >
            进入管理界面
          </Link>
          
          <div className="text-center text-sm text-gray-500">
            <p>端口: 15777</p>
            <p>版本: 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}