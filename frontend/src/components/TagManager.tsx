import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Typography,
	TextField,
	Button,
	Box,
	Chip,
	Checkbox,
	FormControlLabel,
	CircularProgress,
} from '@mui/material';
import { Tag } from '../types';
import { theme } from '../styles/theme';
import { createApiClient } from '../services/api';
import { useApi } from '../hooks/useApi';

interface TagManagerProps {
	packageName: string;
	currentTags: Tag[];
	onTagsUpdated: (tags: Tag[]) => void;
	onClose: () => void;
}

function TagManager({
	packageName,
	currentTags,
	onTagsUpdated,
	onClose,
}: TagManagerProps) {
	const [availableTags, setAvailableTags] = useState<Tag[]>([]);
	const [selectedTags, setSelectedTags] = useState<Tag[]>(currentTags);
	const [newTagName, setNewTagName] = useState('');
	const [newTagDescription, setNewTagDescription] = useState('');
	const [newTagColor, setNewTagColor] = useState('#3B82F6');
	const apiClient = createApiClient();
	const { execute, loading } = useApi();

	useEffect(() => {
		fetchAvailableTags();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchAvailableTags = async () => {
		const result = await execute(
			() => apiClient.get<{ tags: Tag[] }>('/tags'),
			{ showAlert: false }
		);
		if (result) {
			setAvailableTags(result.tags || []);
		}
	};

	const createNewTag = async () => {
		if (!newTagName.trim()) return;

		const result = await execute(
			() => apiClient.post<Tag>('/tags', {
				name: newTagName.trim(),
				description: newTagDescription.trim() || undefined,
				color: newTagColor,
			}),
			{
				onSuccess: () => {
					setNewTagName('');
					setNewTagDescription('');
					setNewTagColor('#3B82F6');
				}
			}
		);

		if (result) {
			setAvailableTags([...availableTags, result]);
			setSelectedTags([...selectedTags, result]);
		}
	};

	const toggleTag = (tag: Tag) => {
		const isSelected = selectedTags.some((t) => t.id === tag.id);
		if (isSelected) {
			setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	const savePackageTags = async () => {
		await execute(
			() => apiClient.put(`/packages/${encodeURIComponent(packageName)}/tags`, {
				tagIds: selectedTags.map((tag) => tag.id),
			}),
			{
				onSuccess: () => {
					onTagsUpdated(selectedTags);
					onClose();
				}
			}
		);
	};

	const predefinedColors = [
		'#3B82F6', // blue
		'#10B981', // emerald
		'#F59E0B', // amber
		'#EF4444', // red
		'#8B5CF6', // violet
		'#06B6D4', // cyan
		'#84CC16', // lime
		'#F97316', // orange
		'#EC4899', // pink
		'#6B7280', // gray
	];

	return (
		<Dialog
			open={true}
			onClose={onClose}
			fullWidth
			sx={{
				'& .MuiDialog-paper': {
					bgcolor: theme.colors.background.card,
				},
			}}
		>
			<DialogTitle>
				<Typography variant="h6" fontWeight="bold">
					{packageName} のタグを編集
				</Typography>
			</DialogTitle>

			<DialogContent>
				{/* 新しいタグ作成 */}
				<Box
					sx={{ mb: 2 }}
					display="flex"
					flexDirection="column"
					gap={1}
				>
					<Typography variant="h6" color={theme.colors.text.primary}>
						新しいタグを作成
					</Typography>
					<TextField
						label="タグ名"
						required
						value={newTagName}
						onChange={(e) => setNewTagName(e.target.value)}
						fullWidth
						variant="outlined"
					/>
					<TextField
						label="説明（任意）"
						value={newTagDescription}
						onChange={(e) => setNewTagDescription(e.target.value)}
						fullWidth
						variant="outlined"
					/>

					<Box
						sx={{
							display: 'flex',
							gap: 1,
							flexWrap: 'wrap',
						}}
					>
						{predefinedColors.map((color) => (
							<Box
								key={color}
								onClick={() => setNewTagColor(color)}
								sx={{
									width: 32,
									height: 32,
									borderRadius: '50%',
									border: `2px solid ${
										newTagColor === color
											? theme.colors.text.primary
											: theme.colors.border.primary
									}`,
									bgcolor: color,
									cursor: 'pointer',
									'&:hover': {
										opacity: 0.8,
									},
								}}
							/>
						))}
						<input
							type="color"
							value={newTagColor}
							onChange={(e) => setNewTagColor(e.target.value)}
							style={{
								width: 32,
								height: 32,
								border: `1px solid ${theme.colors.border.primary}`,
								borderRadius: 4,
							}}
						/>
					</Box>

					<Button
						onClick={createNewTag}
						disabled={!newTagName.trim() || loading}
						variant="contained"
						color="success"
					>
						タグを作成
					</Button>
				</Box>

				{/* 既存タグから選択 */}

				<Typography variant="h6" color={theme.colors.text.primary}>
					既存のタグから選択
				</Typography>
				<Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
					{availableTags.map((tag) => {
						const isSelected = selectedTags.some(
							(t) => t.id === tag.id
						);
						return (
							<FormControlLabel
								key={tag.id}
								control={
									<Checkbox
										checked={isSelected}
										onChange={() => toggleTag(tag)}
									/>
								}
								label={
									<Box
										sx={{
											display: 'flex',
											alignItems: 'center',
											gap: 1,
										}}
									>
										<Chip
											label={tag.name}
											size="small"
											sx={{
												bgcolor: tag.color,
											}}
										/>
										<Typography
											variant="body2"
											color={theme.colors.text.secondary}
										>
											{tag.description}
										</Typography>
									</Box>
								}
								sx={{
									display: 'flex',
									m: 0,
									'&:hover': {
										bgcolor:
											theme.colors.background.secondary,
									},
								}}
							/>
						);
					})}
				</Box>

				{/* 選択中のタグ */}
				<Typography
					variant="h6"
					color={theme.colors.text.primary}
					sx={{ mb: 1 }}
				>
					選択中のタグ ({selectedTags.length}件)
				</Typography>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
					{selectedTags.map((tag) => (
						<Chip
							key={tag.id}
							label={tag.name}
							size="small"
							sx={{
								bgcolor: tag.color,
							}}
						/>
					))}
				</Box>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} color="inherit">
					キャンセル
				</Button>
				<Button
					onClick={savePackageTags}
					disabled={loading}
					variant="contained"
					startIcon={
						loading ? <CircularProgress size={16} /> : undefined
					}
				>
					{loading ? '保存中...' : '保存'}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default TagManager;
