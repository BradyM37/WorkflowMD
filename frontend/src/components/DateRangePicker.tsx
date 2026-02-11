import React, { useState, useEffect } from 'react';
import { 
  Dropdown, 
  Button, 
  Space, 
  DatePicker, 
  Typography, 
  Divider,
  theme
} from 'antd';
import { 
  CalendarOutlined, 
  DownOutlined,
  CheckOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
  days: number;
}

interface DateRangePreset {
  key: string;
  label: string;
  getRange: () => { start: Dayjs; end: Dayjs };
  days: number;
}

const presets: DateRangePreset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => ({
      start: dayjs().startOf('day'),
      end: dayjs().endOf('day')
    }),
    days: 1
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => ({
      start: dayjs().subtract(1, 'day').startOf('day'),
      end: dayjs().subtract(1, 'day').endOf('day')
    }),
    days: 1
  },
  {
    key: 'last7',
    label: 'Last 7 Days',
    getRange: () => ({
      start: dayjs().subtract(6, 'day').startOf('day'),
      end: dayjs().endOf('day')
    }),
    days: 7
  },
  {
    key: 'last14',
    label: 'Last 14 Days',
    getRange: () => ({
      start: dayjs().subtract(13, 'day').startOf('day'),
      end: dayjs().endOf('day')
    }),
    days: 14
  },
  {
    key: 'last30',
    label: 'Last 30 Days',
    getRange: () => ({
      start: dayjs().subtract(29, 'day').startOf('day'),
      end: dayjs().endOf('day')
    }),
    days: 30
  },
  {
    key: 'thisMonth',
    label: 'This Month',
    getRange: () => ({
      start: dayjs().startOf('month'),
      end: dayjs().endOf('day')
    }),
    days: dayjs().date()
  },
  {
    key: 'lastMonth',
    label: 'Last Month',
    getRange: () => ({
      start: dayjs().subtract(1, 'month').startOf('month'),
      end: dayjs().subtract(1, 'month').endOf('month')
    }),
    days: dayjs().subtract(1, 'month').daysInMonth()
  }
];

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

const DateRangePickerComponent: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { token } = theme.useToken();
  const [selectedPreset, setSelectedPreset] = useState<string>('last7');
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Initialize with default value
  useEffect(() => {
    if (!value) {
      const preset = presets.find(p => p.key === 'last7')!;
      const range = preset.getRange();
      onChange({
        startDate: range.start.toDate(),
        endDate: range.end.toDate(),
        label: preset.label,
        days: preset.days
      });
    }
  }, []);

  const handlePresetClick = (preset: DateRangePreset) => {
    setSelectedPreset(preset.key);
    setIsCustom(false);
    const range = preset.getRange();
    onChange({
      startDate: range.start.toDate(),
      endDate: range.end.toDate(),
      label: preset.label,
      days: preset.days
    });
    setDropdownOpen(false);
  };

  const handleCustomRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setCustomRange(dates);
    if (dates && dates[0] && dates[1]) {
      setIsCustom(true);
      setSelectedPreset('custom');
      const days = dates[1].diff(dates[0], 'day') + 1;
      const label = `${dates[0].format('MMM D')} - ${dates[1].format('MMM D, YYYY')}`;
      onChange({
        startDate: dates[0].startOf('day').toDate(),
        endDate: dates[1].endOf('day').toDate(),
        label,
        days
      });
      setDropdownOpen(false);
    }
  };

  const currentLabel = value?.label || 'Last 7 Days';

  const dropdownContent = (
    <div 
      style={{ 
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
        padding: 8,
        minWidth: 200
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12, padding: '4px 12px', display: 'block' }}>
          Quick Select
        </Text>
      </div>
      
      {presets.map(preset => (
        <div
          key={preset.key}
          onClick={() => handlePresetClick(preset)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: token.borderRadius,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: selectedPreset === preset.key && !isCustom 
              ? token.colorPrimaryBg 
              : 'transparent',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            if (selectedPreset !== preset.key || isCustom) {
              e.currentTarget.style.background = token.colorBgTextHover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = selectedPreset === preset.key && !isCustom 
              ? token.colorPrimaryBg 
              : 'transparent';
          }}
        >
          <Text style={{ 
            fontWeight: selectedPreset === preset.key && !isCustom ? 600 : 400,
            color: selectedPreset === preset.key && !isCustom ? token.colorPrimary : token.colorText
          }}>
            {preset.label}
          </Text>
          {selectedPreset === preset.key && !isCustom && (
            <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
          )}
        </div>
      ))}
      
      <Divider style={{ margin: '8px 0' }} />
      
      <div style={{ padding: '4px 12px' }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Custom Range
        </Text>
        <RangePicker
          size="small"
          value={customRange}
          onChange={handleCustomRangeChange}
          style={{ width: '100%' }}
          disabledDate={(current) => current && current > dayjs().endOf('day')}
          allowClear={false}
        />
      </div>
    </div>
  );

  return (
    <Dropdown
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      trigger={['click']}
      dropdownRender={() => dropdownContent}
      disabled={disabled}
    >
      <Button style={{ minWidth: 160 }}>
        <Space>
          <CalendarOutlined />
          <span>{currentLabel}</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      </Button>
    </Dropdown>
  );
};

export default DateRangePickerComponent;
