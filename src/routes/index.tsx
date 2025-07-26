import { createFileRoute } from '@tanstack/react-router';
import { MantineProvider, createTheme } from '@mantine/core';
import { MortgageCalculator } from '../components/mortgage-calculator/MortgageCalculator';

export const Route = createFileRoute('/')({
  component: App,
});

const theme = createTheme({
  /** Put your mantine theme override here */
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <div className="p-4 max-w-7xl mx-auto">
        <MortgageCalculator />
      </div>
    </MantineProvider>
  );
}
