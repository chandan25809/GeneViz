import { Select } from "antd";

type Option = { value: string; label: string };

export default function GeneSelector({
  value,
  options,
  onChange,
  onSearch,
}: {
  value: string[];
  options: Option[];
  onChange: (next: string[]) => void;
  onSearch: (q: string) => void;
}) {
  return (
    <Select
      mode="multiple"
      allowClear
      showSearch
      placeholder="Search or paste genes (comma/newline supported)"
      style={{ width: 720, maxWidth: "100%" }}
      onSearch={onSearch}
      options={options}
      value={value}
      onChange={onChange}
      tokenSeparators={[",", "\n"]}
    />
  );
}
