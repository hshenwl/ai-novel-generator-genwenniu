import { Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

interface Props<T> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  pagination?: TablePaginationConfig | false;
  onChange?: (pagination: TablePaginationConfig) => void;
  scroll?: { x?: number | string; y?: number | string };
}

function CrudTable<T extends object>({
  columns, dataSource, loading, rowKey = 'id',
  pagination = { pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` },
  onChange, scroll,
}: Props<T>) {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey}
      pagination={pagination}
      onChange={onChange as any}
      scroll={scroll || { x: 800 }}
      size="middle"
    />
  );
}

export default CrudTable;
