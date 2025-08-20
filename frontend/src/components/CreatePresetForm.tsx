import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Box, Typography, Button, TextField } from '@mui/material';
import Tag from './ui/Tag';
import Card from './ui/Card';
import PackageAutocomplete from './ui/PackageAutocomplete';
import { createApiClient } from '../services/api';
import { useApi } from '../hooks/useApi';
import { usePackages } from '../hooks/usePackages';

interface CreatePresetFormProps {
	onPresetCreated: () => void;
	onCancel: () => void;
}

export default function CreatePresetForm({
	onPresetCreated,
	onCancel,
}: CreatePresetFormProps) {
	const [title, setTitle] = useState('');
	const [packageInput, setPackageInput] = useState('');
	const [packages, setPackages] = useState<string[]>([]);
	const { getToken } = useAuth();
	const apiClient = createApiClient(getToken);
	const { execute, loading } = useApi();
	const { filterPackages } = usePackages();

	const addPackage = () => {
		const input = packageInput.trim();
		if (!input) return;

		// カンマ区切りで分割
		const newPackages = input
			.split(',')
			.map((pkg) => pkg.trim())
			.filter((pkg) => pkg && !packages.includes(pkg));

		if (newPackages.length > 0) {
			setPackages([...packages, ...newPackages]);
			setPackageInput('');
		}
	};

	const removePackage = (pkg: string) => {
		setPackages(packages.filter((p) => p !== pkg));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim() || packages.length < 2) {
			alert('タイトルと2つ以上のパッケージが必要です');
			return;
		}

		await execute(
			() =>
				apiClient.post(
					'/presets',
					{
						title: title.trim(),
						packages: packages,
					},
					true
				),
			{ onSuccess: onPresetCreated }
		);
	};

	return (
		<Card>
			<Typography variant="h5" sx={{ mb: 2 }}>
				新しいプリセットを作成
			</Typography>

			<form onSubmit={handleSubmit}>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
					<TextField
						label="プリセット名"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="React vs Vue vs Angular"
						required
						variant="outlined"
						size="small"
					/>

					<Box sx={{ display: 'flex', gap: 1 }}>
						<Box sx={{ flexGrow: 1 }}>
							<PackageAutocomplete
								label="パッケージ名"
								value={packageInput}
								onChange={setPackageInput}
								onAdd={addPackage}
								placeholder="react, vue, angular (カンマ区切りで複数入力可能)"
								suggestions={filterPackages(packageInput)}
							/>
						</Box>
						<Button
							onClick={addPackage}
							disabled={!packageInput.trim()}
							variant="contained"
						>
							追加
						</Button>
					</Box>

					{packages.length > 0 && (
						<>
							<Typography variant="body2" sx={{ mb: 1 }}>
								選択されたパッケージ ({packages.length}/10)
							</Typography>
							<Box
								sx={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 1,
								}}
							>
								{packages.map((pkg) => (
									<Tag
										key={pkg}
										variant="removable"
										onRemove={() => removePackage(pkg)}
									>
										{pkg}
									</Tag>
								))}
							</Box>
						</>
					)}

					<Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
						<Button variant="contained" onClick={onCancel}>
							キャンセル
						</Button>
						<Button
							type="submit"
							variant="contained"
							disabled={
								loading || !title.trim() || packages.length < 2
							}
							sx={{ flexGrow: 1 }}
						>
							{loading ? '作成中...' : 'プリセット作成'}
						</Button>
					</Box>
				</Box>
			</form>
		</Card>
	);
}
