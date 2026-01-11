import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid } from 'recharts';

interface BarChartProps {
  title: string;
  data: Array<{ [key: string]: any }>;
  xAxis: string;
  yAxis: string;
  className?: string;
}

const chartConfig = {
  value: {
    label: 'Value',
    color: 'hsl(var(--chart-2))',
  },
};

export function BarChart({ title, data, xAxis, yAxis, className }: BarChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xAxis}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey={yAxis}
              fill="var(--color-value)"
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

