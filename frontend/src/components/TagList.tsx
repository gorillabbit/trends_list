import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '../types';
import { Loading } from './assets/Loading';
import { HomeLink } from './assets/HomeLink';

function TagList() {
	const [tags, setTags] = useState<Tag[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		fetchTags();
	}, []);

	const fetchTags = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/tags');
			if (res.ok) {
				const data = await res.json();
				setTags(data.tags || []);
			} else {
				setError('タグの取得に失敗しました');
			}
		} catch (err) {
			console.error('Failed to fetch tags:', err);
			setError('タグの取得に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <Loading />;
	}

	if (error) {
		return <HomeLink />;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<HomeLink />;
					<h1 className="text-3xl font-bold mb-4 text-gray-900">
						タグ一覧
					</h1>
					<p className="text-gray-600">
						パッケージのカテゴリやタグを探して、関連するパッケージのトレンドを確認できます。
					</p>
				</div>

				{tags.length === 0 ? (
					<div className="text-center text-gray-600">
						タグが見つかりませんでした。
						<HomeLink />;
					</div>
				) : (
					<div>
						<div className="mb-6">
							<h2 className="text-xl font-semibold mb-3 text-gray-900">
								すべてのタグ ({tags.length}件)
							</h2>
						</div>

						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{tags.map((tag) => (
								<Link
									key={tag.id}
									to={`/tags/${tag.id}`}
									className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow group"
								>
									<div className="flex items-center gap-3 mb-3">
										<span
											className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
											style={{
												backgroundColor: tag.color,
											}}
										>
											{tag.name}
										</span>
									</div>

									{tag.description && (
										<p className="text-sm text-gray-600 mb-3 line-clamp-3">
											{tag.description}
										</p>
									)}

									<div className="text-xs text-gray-500">
										作成日:{' '}
										{new Date(
											tag.created_at
										).toLocaleDateString('ja-JP')}
									</div>

									<div className="mt-3 text-sm text-blue-600 group-hover:text-blue-800">
										パッケージを見る →
									</div>
								</Link>
							))}
						</div>

						<div className="mt-8 text-center">
							<div className="bg-white rounded-lg p-6 shadow-sm border">
								<h3 className="text-lg font-semibold mb-2 text-gray-900">
									タグを活用しよう
								</h3>
								<p className="text-gray-600 mb-4">
									各タグページでは、そのカテゴリに属する全パッケージのNPM
									Trendsでの比較や、
									個別パッケージの詳細情報を確認できます。
								</p>
								<div className="flex flex-wrap gap-2 justify-center">
									<span className="text-sm text-gray-500">
										例:
									</span>
									{tags.slice(0, 5).map((tag) => (
										<Link
											key={tag.id}
											to={`/tags/${tag.id}`}
											className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white hover:opacity-80"
											style={{
												backgroundColor: tag.color,
											}}
										>
											{tag.name}
										</Link>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default TagList;
