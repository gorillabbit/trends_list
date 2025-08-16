import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

function ExternalLinkProxy() {
  const { encodedUrl } = useParams<{ encodedUrl: string }>();

  useEffect(() => {
    if (encodedUrl) {
      try {
        const decodedUrl = decodeURIComponent(encodedUrl);
        // 外部URLにリダイレクト
        window.location.href = decodedUrl;
      } catch (error) {
        console.error('Invalid URL:', error);
        // エラーの場合はホームに戻る
        window.location.href = '/';
      }
    }
  }, [encodedUrl]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-gray-600 mb-4">外部サイトにリダイレクト中...</div>
        <div className="text-sm text-gray-500">
          自動的にリダイレクトされない場合は、
          <a 
            href={encodedUrl ? decodeURIComponent(encodedUrl) : '/'}
            className="text-blue-600 hover:text-blue-800 underline ml-1"
          >
            こちらをクリック
          </a>
        </div>
      </div>
    </div>
  );
}

export default ExternalLinkProxy;