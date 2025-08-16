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
		<>
			<div>外部サイトにリダイレクト中...</div>
			<div>
				自動的にリダイレクトされない場合は、
				<a href={encodedUrl ? decodeURIComponent(encodedUrl) : '/'}>
					こちらをクリック
				</a>
			</div>
		</>
	);
}

export default ExternalLinkProxy;
