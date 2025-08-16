import { useState, useEffect } from 'react';
import { Tag } from '../types';

interface TagManagerProps {
  packageName: string;
  currentTags: Tag[];
  onTagsUpdated: (tags: Tag[]) => void;
  onClose: () => void;
}

function TagManager({ packageName, currentTags, onTagsUpdated, onClose }: TagManagerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(currentTags);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const fetchAvailableTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const createNewTag = async () => {
    if (!newTagName.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          description: newTagDescription.trim() || undefined,
          color: newTagColor,
        }),
      });

      if (res.ok) {
        const newTag: Tag = await res.json();
        setAvailableTags([...availableTags, newTag]);
        setSelectedTags([...selectedTags, newTag]);
        setNewTagName('');
        setNewTagDescription('');
        setNewTagColor('#3B82F6');
      } else {
        const data = await res.json();
        alert(data.error || 'タグの作成に失敗しました');
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
      alert('タグの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    if (isSelected) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const savePackageTags = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/packages/${encodeURIComponent(packageName)}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagIds: selectedTags.map(tag => tag.id),
        }),
      });

      if (res.ok) {
        onTagsUpdated(selectedTags);
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'タグの保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to save package tags:', err);
      alert('タグの保存に失敗しました');
    } finally {
      setLoading(false);
    }
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
    <div className="tag-manager-overlay">
      <div className="tag-manager-modal">
        <div className="tag-manager-header">
          <h2 className="tag-manager-title">
            {packageName} のタグを編集
          </h2>
          <button
            onClick={onClose}
            className="close-button"
          >
            ✕
          </button>
        </div>

        {/* 新しいタグ作成 */}
        <div className="new-tag-section">
          <h3 className="section-title">新しいタグを作成</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タグ名 *
              </label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: フロントエンド"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明（任意）
              </label>
              <input
                type="text"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: フロントエンド開発用ライブラリ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                色
              </label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300"
                />
              </div>
            </div>
            <button
              onClick={createNewTag}
              disabled={!newTagName.trim() || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              タグを作成
            </button>
          </div>
        </div>

        {/* 既存タグから選択 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">既存のタグから選択</h3>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.some(t => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag)}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    {tag.description && (
                      <span className="text-sm text-gray-600">{tag.description}</span>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 選択中のタグ */}
        {selectedTags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">選択中のタグ</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                  title={tag.description}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={savePackageTags}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TagManager;