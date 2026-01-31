/**
 * CategoryBadge - Small colored badge showing category
 */

import type { Category } from '../types';

interface CategoryBadgeProps {
  category: Category;
  onClick?: () => void;
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps): JSX.Element {
  return (
    <span
      className="category-badge"
      style={{
        backgroundColor: category.color,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={category.name}
    >
      {category.icon || category.name.charAt(0).toUpperCase()}
    </span>
  );
}

interface CategoryBadgesProps {
  categories: Category[];
  categoryIds: string[];
  maxVisible?: number;
  onClick?: (categoryId: string) => void;
}

export function CategoryBadges({
  categories,
  categoryIds,
  maxVisible = 3,
  onClick,
}: CategoryBadgesProps): JSX.Element | null {
  if (!categoryIds || categoryIds.length === 0) return null;

  const visibleCategories = categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c)
    .slice(0, maxVisible);

  const remaining = categoryIds.length - visibleCategories.length;

  return (
    <div className="category-badges">
      {visibleCategories.map((category) => (
        <CategoryBadge
          key={category.id}
          category={category}
          onClick={() => onClick?.(category.id)}
        />
      ))}
      {remaining > 0 && (
        <span className="category-badge more">+{remaining}</span>
      )}
    </div>
  );
}
