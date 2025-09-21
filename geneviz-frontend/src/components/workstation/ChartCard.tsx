import { Card, Typography } from "antd";
import type { PropsWithChildren, ReactNode } from "react";

const { Text } = Typography;

export default function ChartCard({
  title,
  extra,
  children,
}: PropsWithChildren<{ title: string; extra?: ReactNode }>) {
  return (
    <Card
      title={<div className="card-drag" style={{ cursor: "move" }}>{title}</div>}
      extra={extra ?? <Text type="secondary">&nbsp;</Text>}
      styles={{ body: { height: "100%", padding: 8 } }}
    >
      {children}
    </Card>
  );
}
