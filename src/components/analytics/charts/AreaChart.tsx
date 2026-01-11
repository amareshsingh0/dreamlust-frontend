import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart as RechartsAreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AreaChartProps {
  title: string;
  data: Array<{ [key: string]: any }>;
  xAxis: string;
  yAxis: string;
  className?: string;
}

const chartConfig = {
  value: {
    label: 'Value',
    color: 'hsl(var(--chart-1))',
  },
};

export function AreaChart({ title, data, xAxis, yAxis, className }: AreaChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <RechartsAreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xAxis}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey={yAxis}
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.2}
            />
          </RechartsAreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

