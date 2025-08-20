/**
 * 虚拟化规则列表组件
 * 支持大量规则的高性能渲染
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ExceptionRule } from '../types';
import { SearchResult } from '../utils/ruleSearchOptimizer';
import { CheckCircle, Plus, TrendingUp, History, X } from 'lucide-react';

interface VirtualizedRuleListProps {
  rules: SearchResult[];
  onSelect: (rule: ExceptionRule) => void;
  onDelete?: (rule: ExceptionRule) => void;
  onCreateNew?: (name: string) => void;
  searchQuery?: string;
  isLoading?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
}

export const VirtualizedRuleList: React.FC<VirtualizedRuleListProps> = ({
  rules,
  onSelect,
  onDelete,
  onCreateNew,
  searchQuery = '',
  isLoading = false,
  itemHeight = 80, // 增加默认高度以提供更好的间距
  containerHeight = 400,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // 计算可见项目范围
  const visibleRange = useMemo(() => {
    // 只有在搜索查询存在且没有找到完全匹配规则时才显示创建新规则选项
    const hasExactMatch = rules.some(result => result.matchType === 'exact');
    const shouldShowCreateNew = onCreateNew && searchQuery.trim() && !hasExactMatch;
    const totalItems = rules.length + (shouldShowCreateNew ? 1 : 0);
    
    if (totalItems === 0) {
      return { start: 0, end: 0, totalItems: 0 };
    }

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerSize.height / itemHeight);
    const end = Math.min(start + visibleCount + overscan, totalItems);
    const adjustedStart = Math.max(0, start - overscan);

    return {
      start: adjustedStart,
      end,
      totalItems
    };
  }, [scrollTop, itemHeight, containerSize.height, rules, overscan, onCreateNew, searchQuery]);

  // 计算虚拟项目
  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight
      });
    }
    
    return items;
  }, [visibleRange, itemHeight]);

  // 总高度
  const totalHeight = visibleRange.totalItems * itemHeight;

  // 滚动处理（节流）
  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      setScrollTop(scrollTop);
    }, 16), // 60fps
    []
  );

  // 容器大小变化处理
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();
    
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 滚动到指定项目
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return;

    const itemTop = index * itemHeight;
    let scrollTop: number;

    switch (align) {
      case 'start':
        scrollTop = itemTop;
        break;
      case 'center':
        scrollTop = itemTop - (containerSize.height - itemHeight) / 2;
        break;
      case 'end':
        scrollTop = itemTop - containerSize.height + itemHeight;
        break;
    }

    scrollElementRef.current.scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerSize.height));
  }, [itemHeight, containerSize.height, totalHeight]);

  // 渲染创建新规则项
  const renderCreateNewItem = useCallback((index: number) => {
    // 只有在搜索查询存在且没有找到完全匹配的规则时才显示
    if (!onCreateNew || !searchQuery.trim()) return null;
    
    // 检查是否有完全匹配的规则
    const hasExactMatch = rules.some(result => result.matchType === 'exact');
    if (hasExactMatch) return null;

    return (
      <button
        onClick={() => onCreateNew(searchQuery.trim())}
        className="w-full my-2 flex items-center space-x-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors text-left"
        style={{ maxWidth: '100%', boxSizing: 'border-box', margin: '8px 0' }}
      >
        <Plus className="text-primary-500 flex-shrink-0" size={20} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary-700 dark:text-primary-300 truncate">
            创建新规则: "{searchQuery.trim()}"
          </div>
          <div className="text-sm text-primary-600 dark:text-primary-400">
            为当前任务链创建专属规则
          </div>
        </div>
      </button>
    );
  }, [onCreateNew, searchQuery, rules]);

  // 渲染规则项
  const renderRuleItem = useCallback((result: SearchResult, index: number) => {
    const rule = result.rule;
    // 检查是否应该显示创建新规则选项
    const hasExactMatch = rules.some(result => result.matchType === 'exact');
    const shouldShowCreateNew = onCreateNew && searchQuery.trim() && !hasExactMatch;
    const actualIndex = shouldShowCreateNew ? index - 1 : index;
    
    if (actualIndex < 0 || actualIndex >= rules.length) return null;

    return (
      <div className="w-full my-2 flex items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-transparent hover:border-primary-200 dark:hover:border-primary-500/30" style={{ maxWidth: '100%', boxSizing: 'border-box', margin: '8px 0' }}>
        <button
          onClick={() => onSelect(rule)}
          className="flex-1 flex items-center text-left min-w-0"
        >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {highlightText(rule.name, result.highlightRanges)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <TrendingUp size={12} />
                  <span>使用过 {rule.usageCount || 0} 次</span>
                </span>
                {rule.lastUsedAt && (
                  <span className="flex items-center space-x-1">
                    <History size={12} />
                    <span>{formatLastUsed(rule.lastUsedAt)}</span>
                  </span>
                )}
                {result.matchType !== 'exact' && (
                  <span className="text-primary-500 text-xs">
                    {getMatchTypeLabel(result.matchType)}
                  </span>
                )}
              </div>
            </div>
          </button>
          
          <div className="flex items-center space-x-2 ml-4">
            {/* 使用频率可视化 */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-4 rounded-full ${
                    i < Math.min(rule.usageCount || 0, 5)
                      ? 'bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(rule);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                title="删除规则"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
    );
  }, [rules, onSelect, itemHeight, onCreateNew, searchQuery]);

  // 高亮搜索匹配的文本
  const highlightText = (text: string, ranges: Array<{ start: number; end: number }>) => {
    // 确保text是字符串
    const safeText = String(text || '');
    if (!ranges.length) return safeText;
    
    const parts = [];
    let lastIndex = 0;
    
    for (const range of ranges) {
      if (range.start > lastIndex) {
        parts.push(safeText.slice(lastIndex, range.start));
      }
      parts.push(
        <mark key={`${range.start}-${range.end}`} className="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">
          {safeText.slice(range.start, range.end)}
        </mark>
      );
      lastIndex = range.end;
    }
    
    if (lastIndex < safeText.length) {
      parts.push(safeText.slice(lastIndex));
    }
    
    return parts;
  };

  // 格式化最后使用时间
  const formatLastUsed = (date: Date): string => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return `${Math.floor(diffDays / 7)}周前`;
  };

  // 获取匹配类型标签
  const getMatchTypeLabel = (matchType: string): string => {
    switch (matchType) {
      case 'prefix': return '前缀匹配';
      case 'contains': return '包含匹配';
      case 'fuzzy': return '模糊匹配';
      default: return '';
    }
  };

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-500 dark:text-gray-400 mb-4">
        {searchQuery.trim() ? '未找到匹配的规则' : '暂无可用规则'}
      </div>
      {searchQuery.trim() && onCreateNew && (
        <button
          onClick={() => onCreateNew(searchQuery.trim())}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          <span>创建 "{searchQuery.trim()}"</span>
        </button>
      )}
    </div>
  );

  // 渲染加载状态
  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-400">加载规则中...</span>
    </div>
  );

  if (isLoading) {
    return (
      <div ref={containerRef} style={{ height: containerHeight }}>
        {renderLoadingState()}
      </div>
    );
  }

  if (visibleRange.totalItems === 0) {
    return (
      <div ref={containerRef} style={{ height: containerHeight }}>
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="overflow-auto h-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
        onScroll={handleScroll}
        style={{
          height: `${containerHeight}px`,
          maxHeight: `${containerHeight}px`,
          width: '100%',
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth'
        }}
      >
        {/* 虚拟滚动容器 - 使用无序列表 */}
        <ul
          className="relative list-none p-0 m-0 h-full"
          style={{
            minHeight: `${totalHeight}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {/* 渲染可见项目 */}
          {virtualItems.map((virtualItem) => {
            // 只有在搜索查询存在且没有找到完全匹配规则时才显示创建新规则选项
            const hasExactMatch = rules.some(result => result.matchType === 'exact');
            const shouldShowCreateNew = onCreateNew && searchQuery.trim() && !hasExactMatch;
            const isCreateNewItem = shouldShowCreateNew && virtualItem.index === 0;
            
            if (isCreateNewItem) {
              return (
                <li
                  key="create-new"
                  className="w-full"
                  style={{
                    boxSizing: 'border-box',
                    listStyle: 'none',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    padding: '0 12px'
                  }}
                >
                  {renderCreateNewItem(virtualItem.index)}
                </li>
              );
            }

            const ruleIndex = shouldShowCreateNew ? virtualItem.index - 1 : virtualItem.index;
            const result = rules[ruleIndex];
            
            if (!result) return null;

            return (
              <li
                key={result.rule.id}
                className="w-full"
                style={{
                  boxSizing: 'border-box',
                  listStyle: 'none',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  padding: '0 12px'
                }}
              >
                {renderRuleItem(result, virtualItem.index)}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

// 节流函数
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}