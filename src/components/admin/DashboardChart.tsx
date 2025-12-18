import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ChartDataPoint {
  date: string;
  value: number;
}

interface CategoryData {
  name: string;
  count: number;
}

interface DashboardChartProps {
  type: 'line' | 'bar' | 'doughnut';
  title: string;
  description?: string;
  data: ChartDataPoint[] | CategoryData[];
  label?: string;
  color?: string;
}

export function DashboardChart({
  type,
  title,
  description,
  data,
  label = 'Value',
  color = '#3b82f6',
}: DashboardChartProps) {
  const chartData = useMemo(() => {
    if (type === 'doughnut') {
      const categoryData = data as CategoryData[];
      return {
        labels: categoryData.map((d) => d.name),
        datasets: [
          {
            label: 'Count',
            data: categoryData.map((d) => d.count),
            backgroundColor: [
              '#3b82f6',
              '#ef4444',
              '#10b981',
              '#f59e0b',
              '#8b5cf6',
              '#ec4899',
              '#06b6d4',
              '#84cc16',
            ],
            borderColor: '#1e293b',
            borderWidth: 2,
          },
        ],
      };
    }

    const chartDataPoints = data as ChartDataPoint[];
    const labels = chartDataPoints.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label,
          data: chartDataPoints.map((d) => d.value),
          borderColor: color,
          backgroundColor: `${color}20`,
          borderWidth: 2,
          fill: type === 'line',
          tension: 0.4,
        },
      ],
    };
  }, [data, type, label, color]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type !== 'doughnut',
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales:
      type === 'doughnut'
        ? undefined
        : {
            x: {
              display: true,
              grid: {
                display: false,
              },
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
            },
          },
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={options} />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-64">{renderChart()}</div>
      </CardContent>
    </Card>
  );
}

