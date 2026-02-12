import React, { useState, useCallback, useMemo } from 'react';
import { Input, Space, Tag, theme } from 'antd';
import { SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useDebouncedCallback } from 'use-debounce';

const { useToken } = theme;

interface ConversationSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  showTags?: boolean;
  loading?: boolean;
}

interface SearchSuggestion {
  type: 'name' | 'phone' | 'email';
  prefix: string;
  example: string;
}

const searchSuggestions: SearchSuggestion[] = [
  { type: 'name', prefix: 'name:', example: 'John' },
  { type: 'phone', prefix: 'phone:', example: '555-1234' },
  { type: 'email', prefix: 'email:', example: 'john@example.com' },
];

const ConversationSearch: React.FC<ConversationSearchProps> = ({
  onSearch,
  placeholder = 'Search by name, phone, or email...',
  defaultValue = '',
  showTags = true,
  loading = false,
}) => {
  const { token } = useToken();
  const [value, setValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  // Debounced search handler - 300ms delay
  const debouncedSearch = useDebouncedCallback((searchValue: string) => {
    onSearch(searchValue);
  }, 300);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  }, [debouncedSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  const handleTagClick = useCallback((prefix: string) => {
    const newValue = value ? `${value} ${prefix}` : prefix;
    setValue(newValue);
    debouncedSearch(newValue);
  }, [value, debouncedSearch]);

  // Parse active search filters from query
  const activeFilters = useMemo(() => {
    const filters: { type: string; value: string }[] = [];
    const parts = value.split(/\s+/);
    
    parts.forEach(part => {
      if (part.startsWith('name:')) {
        filters.push({ type: 'name', value: part.slice(5) });
      } else if (part.startsWith('phone:')) {
        filters.push({ type: 'phone', value: part.slice(6) });
      } else if (part.startsWith('email:')) {
        filters.push({ type: 'email', value: part.slice(6) });
      }
    });
    
    return filters;
  }, [value]);

  return (
    <div style={{ marginBottom: 16 }}>
      <Input
        prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
        suffix={
          value ? (
            <CloseCircleOutlined
              style={{ color: token.colorTextPlaceholder, cursor: 'pointer' }}
              onClick={handleClear}
            />
          ) : null
        }
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        allowClear={false}
        size="large"
        style={{
          borderRadius: token.borderRadiusLG,
          transition: 'all 0.3s',
          boxShadow: isFocused ? `0 0 0 2px ${token.colorPrimaryBg}` : 'none',
        }}
        disabled={loading}
      />
      
      {showTags && isFocused && !value && (
        <Space style={{ marginTop: 8 }} wrap>
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            Search tips:
          </span>
          {searchSuggestions.map((suggestion) => (
            <Tag
              key={suggestion.type}
              style={{ cursor: 'pointer' }}
              onClick={() => handleTagClick(suggestion.prefix)}
            >
              {suggestion.prefix}
              <span style={{ color: token.colorTextSecondary }}>
                {suggestion.example}
              </span>
            </Tag>
          ))}
        </Space>
      )}
      
      {activeFilters.length > 0 && (
        <Space style={{ marginTop: 8 }} wrap>
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            Active filters:
          </span>
          {activeFilters.map((filter, index) => (
            <Tag
              key={`${filter.type}-${index}`}
              color="blue"
              closable
              onClose={() => {
                const newValue = value
                  .replace(new RegExp(`${filter.type}:${filter.value}\\s*`, 'g'), '')
                  .trim();
                setValue(newValue);
                debouncedSearch(newValue);
              }}
            >
              {filter.type}: {filter.value}
            </Tag>
          ))}
        </Space>
      )}
    </div>
  );
};

export default ConversationSearch;
