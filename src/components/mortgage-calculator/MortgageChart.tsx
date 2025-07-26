import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Title } from '@mantine/core';

interface ChartData {
  year: number;
  principal: number;
  interest: number;
  balance: number;
  tax: number;
}

interface MortgageChartProps {
  data: ChartData[];
}

export function MortgageChart({ data }: MortgageChartProps) {
  // Calculate the maximum value for the primary Y-axis (bars)
  const maxBarValue = Math.max(
    ...data.map(d => d.principal + d.interest + d.tax)
  );
  
  // Scale the balance values to fit within the bar chart range
  const scaledData = data.map(d => ({
    ...d,
    scaledBalance: (d.balance / Math.max(...data.map(d => d.balance))) * maxBarValue
  }));

  return (
    <Paper withBorder p="md">
      <Title order={3} mb="md">Payment Schedule</Title>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={scaledData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            label={{
              value: 'Amount ($)',
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              if (name === 'Remaining Balance') {
                // Show the true balance value, not the scaled one
                const originalData = data[props.payload.year - 1];
                return ['$' + originalData.balance.toLocaleString(), 'Remaining Balance'];
              }
              return ['$' + value.toFixed(2), name];
            }}
            labelFormatter={(year) => `Year ${year}`}
          />
          <Legend />
          <Bar dataKey="tax" stackId="a" fill="#8884d8" name="Taxes & Fees" />
          <Bar dataKey="interest" stackId="a" fill="#82ca9d" name="Interest" />
          <Bar dataKey="principal" stackId="a" fill="#ffc658" name="Principal" />
          <Line 
            type="monotone" 
            dataKey="scaledBalance" 
            stroke="#ff7300" 
            strokeWidth={2}
            dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#ff7300', strokeWidth: 2, fill: '#fff' }}
            name="Remaining Balance"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
} 