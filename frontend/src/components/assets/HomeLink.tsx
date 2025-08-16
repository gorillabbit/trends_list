import { Link } from 'react-router-dom';

export const HomeLink = () => {
	return (
		<Link to="/" className="text-blue-600 hover:text-blue-800 underline">
			ホームに戻る
		</Link>
	);
};
