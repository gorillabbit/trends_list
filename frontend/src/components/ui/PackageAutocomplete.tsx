import { useState, useEffect, useRef } from 'react';
import {
	TextField,
	Box,
	List,
	ListItem,
	ListItemText,
	Paper,
	Popper,
	ClickAwayListener,
} from '@mui/material';
import { theme } from '../../styles/theme';

interface PackageAutocompleteProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	onAdd?: () => void;
	placeholder?: string;
	suggestions: string[];
	disabled?: boolean;
}

export default function PackageAutocomplete({
	label,
	value,
	onChange,
	onAdd,
	placeholder,
	suggestions,
	disabled = false,
}: PackageAutocompleteProps) {
	const [open, setOpen] = useState(false);
	const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>(
		[]
	);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const anchorRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (value.trim() && suggestions.length > 0) {
			const filtered = suggestions.filter(
				(suggestion) =>
					suggestion.toLowerCase().includes(value.toLowerCase()) &&
					suggestion !== value
			);
			setFilteredSuggestions(filtered);
			setOpen(filtered.length > 0);
		} else {
			setFilteredSuggestions([]);
			setOpen(false);
		}
		setHighlightedIndex(-1);
	}, [value, suggestions]);

	const handleSuggestionClick = (suggestion: string) => {
		onChange(suggestion);
		setOpen(false);
		setHighlightedIndex(-1);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!open || filteredSuggestions.length === 0) {
			if (e.key === 'Enter' && onAdd) {
				e.preventDefault();
				onAdd();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev < filteredSuggestions.length - 1 ? prev + 1 : 0
				);
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev > 0 ? prev - 1 : filteredSuggestions.length - 1
				);
				break;
			case 'Enter':
				e.preventDefault();
				if (
					highlightedIndex >= 0 &&
					highlightedIndex < filteredSuggestions.length
				) {
					handleSuggestionClick(
						filteredSuggestions[highlightedIndex]
					);
				} else if (onAdd) {
					onAdd();
				}
				break;
			case 'Escape':
				setOpen(false);
				setHighlightedIndex(-1);
				break;
		}
	};

	const handleClickAway = () => {
		setOpen(false);
		setHighlightedIndex(-1);
	};

	return (
		<ClickAwayListener onClickAway={handleClickAway}>
			<Box ref={anchorRef} sx={{ position: 'relative' }}>
				<TextField
					ref={inputRef}
					label={label}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					variant="outlined"
					size="small"
					disabled={disabled}
					sx={{ width: '100%' }}
					autoComplete="off"
				/>

				<Popper
					open={open}
					anchorEl={anchorRef.current}
					placement="bottom-start"
					style={{
						zIndex: 1300,
						width: anchorRef.current?.offsetWidth,
					}}
				>
					<Paper
						elevation={8}
						sx={{
							maxHeight: 200,
							overflow: 'auto',
							border: `1px solid ${theme.colors.border}`,
						}}
					>
						<List dense sx={{ padding: 0 }}>
							{filteredSuggestions.map((suggestion, index) => (
								<ListItem
									key={suggestion}
									onClick={() =>
										handleSuggestionClick(suggestion)
									}
									sx={{
										cursor: 'pointer',
										backgroundColor:
											index === highlightedIndex
												? theme.colors.accent.primary +
												  '20'
												: 'transparent',
										'&:hover': {
											backgroundColor:
												theme.colors.accent.primary +
												'30',
										},
									}}
								>
									<ListItemText
										primary={suggestion}
										sx={{
											'& .MuiListItemText-primary': {
												fontSize: '0.875rem',
											},
										}}
									/>
								</ListItem>
							))}
						</List>
					</Paper>
				</Popper>
			</Box>
		</ClickAwayListener>
	);
}
