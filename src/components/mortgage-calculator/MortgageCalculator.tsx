import { useState, useMemo, useEffect } from 'react';
import { TextInput, NumberInput, Select, Stack, Title, Paper, Group, Text, Button, Modal, Table, Badge } from '@mantine/core';
import { MortgageChart } from './MortgageChart';

interface MortgageValues {
  homeValue: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  propertyTax: number;
  pmi: number;
  homeInsurance: number;
  monthlyHOA: number;
  loanType: 'purchase' | 'refi';
}

interface SavedMortgage extends MortgageValues {
  id: string;
  name: string;
  savedAt: string;
}

interface RateComparison {
  rate: number;
  monthlyPayment: number;
  totalInterest: number;
  savings: number;
}

export function MortgageCalculator() {
  const [values, setValues] = useState<MortgageValues>({
    homeValue: 400000,
    downPayment: 80000,
    loanAmount: 320000,
    interestRate: 6.48,
    loanTerm: 30,
    propertyTax: 3000,
    pmi: 0.5,
    homeInsurance: 1500,
    monthlyHOA: 0,
    loanType: 'purchase',
  });

  const [savedMortgages, setSavedMortgages] = useState<SavedMortgage[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [mortgageName, setMortgageName] = useState('');
  const [rateComparisons, setRateComparisons] = useState<RateComparison[]>([]);

  // Load saved mortgages from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('savedMortgages');
    if (saved) {
      try {
        setSavedMortgages(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved mortgages:', error);
      }
    }
  }, []);

  // Save mortgages to localStorage whenever savedMortgages changes
  useEffect(() => {
    localStorage.setItem('savedMortgages', JSON.stringify(savedMortgages));
  }, [savedMortgages]);

  const handleValueChange = (field: keyof MortgageValues, value: number | string) => {
    setValues((prev) => {
      const newValues = { ...prev, [field]: value };
      
      // Update loan amount when home value or down payment changes
      if (field === 'homeValue' || field === 'downPayment') {
        newValues.loanAmount = newValues.homeValue - newValues.downPayment;
      }
      
      return newValues;
    });
  };

  const calculateMonthlyPayment = (rate?: number) => {
    const principal = values.loanAmount;
    const monthlyInterestRate = (rate || values.interestRate) / 100 / 12;
    const numberOfPayments = values.loanTerm * 12;

    // Monthly P&I payment using the mortgage payment formula
    const monthlyPI =
      (principal *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    // Monthly property tax
    const monthlyTax = values.propertyTax / 12;

    // Monthly PMI (if down payment is less than 20%)
    const monthlyPMI =
      values.downPayment / values.homeValue < 0.2
        ? (values.loanAmount * (values.pmi / 100)) / 12
        : 0;

    // Monthly home insurance
    const monthlyInsurance = values.homeInsurance / 12;

    // Total monthly payment
    const totalMonthly = monthlyPI + monthlyTax + monthlyPMI + monthlyInsurance + values.monthlyHOA;

    return {
      total: totalMonthly,
      principalAndInterest: monthlyPI,
      tax: monthlyTax,
      pmi: monthlyPMI,
      insurance: monthlyInsurance,
      hoa: values.monthlyHOA,
    };
  };

  const calculateTotalInterest = (rate?: number) => {
    const monthlyPayment = calculateMonthlyPayment(rate).principalAndInterest;
    const totalPayments = monthlyPayment * values.loanTerm * 12;
    return totalPayments - values.loanAmount;
  };

  const currentMonthlyPayment = useMemo(() => calculateMonthlyPayment(), [values]);

  const calculateAmortizationSchedule = useMemo(() => {
    const monthlyInterestRate = values.interestRate / 100 / 12;
    const numberOfPayments = values.loanTerm * 12;
    const monthlyPI = currentMonthlyPayment.principalAndInterest;
    
    let balance = values.loanAmount;
    const schedule = [];

    for (let year = 1; year <= values.loanTerm; year++) {
      let yearlyPrincipal = 0;
      let yearlyInterest = 0;

      for (let month = 1; month <= 12; month++) {
        const interestPayment = balance * monthlyInterestRate;
        const principalPayment = monthlyPI - interestPayment;
        
        yearlyPrincipal += principalPayment;
        yearlyInterest += interestPayment;
        balance -= principalPayment;
      }

      schedule.push({
        year,
        principal: yearlyPrincipal,
        interest: yearlyInterest,
        balance: Math.max(0, balance),
        tax: values.propertyTax,
      });
    }

    return schedule;
  }, [values, currentMonthlyPayment.principalAndInterest]);

  const handleSaveMortgage = () => {
    if (!mortgageName.trim()) return;
    
    const newMortgage: SavedMortgage = {
      ...values,
      id: Date.now().toString(),
      name: mortgageName.trim(),
      savedAt: new Date().toISOString(),
    };
    
    setSavedMortgages(prev => [...prev, newMortgage]);
    setMortgageName('');
    setShowSaveModal(false);
  };

  const handleLoadMortgage = (mortgage: SavedMortgage) => {
    setValues({
      homeValue: mortgage.homeValue,
      downPayment: mortgage.downPayment,
      loanAmount: mortgage.loanAmount,
      interestRate: mortgage.interestRate,
      loanTerm: mortgage.loanTerm,
      propertyTax: mortgage.propertyTax,
      pmi: mortgage.pmi,
      homeInsurance: mortgage.homeInsurance,
      monthlyHOA: mortgage.monthlyHOA,
      loanType: mortgage.loanType,
    });
    setShowLoadModal(false);
  };

  const handleDeleteMortgage = (id: string) => {
    setSavedMortgages(prev => prev.filter(m => m.id !== id));
  };

  const generateRateComparisons = () => {
    const currentRate = values.interestRate;
    const comparisons: RateComparison[] = [];
    
    // Generate comparisons for rates from -2% to +2% in 0.25% increments
    for (let rateOffset = -2; rateOffset <= 2; rateOffset += 0.25) {
      const rate = currentRate + rateOffset;
      if (rate > 0) {
        const monthlyPayment = calculateMonthlyPayment(rate).total;
        const totalInterest = calculateTotalInterest(rate);
        const savings = currentMonthlyPayment.total - monthlyPayment;
        
        comparisons.push({
          rate,
          monthlyPayment,
          totalInterest,
          savings,
        });
      }
    }
    
    setRateComparisons(comparisons);
    setShowCompareModal(true);
  };

  return (
    <Paper p="md" radius="md">
              <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Title order={2}>Mortgage Calculator</Title>
            <Group>
              <Button variant="outline" onClick={() => setShowSaveModal(true)}>
                Save Mortgage
              </Button>
              <Button variant="outline" onClick={() => setShowLoadModal(true)}>
                Load Mortgage
              </Button>
              <Button variant="outline" onClick={generateRateComparisons}>
                Compare Rates
              </Button>
            </Group>
          </Group>

                  <Group grow align="flex-start">
            <Stack gap="md" style={{ flex: 1 }}>
            <Select
              label="Loan Type"
              value={values.loanType}
              onChange={(val) => handleValueChange('loanType', val as 'purchase' | 'refi')}
              data={[
                { value: 'purchase', label: 'Purchase' },
                { value: 'refi', label: 'Refinance' },
              ]}
            />

            <NumberInput
              label="Home Value"
              value={values.homeValue}
              onChange={(val) => handleValueChange('homeValue', val || 0)}
              prefix="$"
              thousandSeparator=","
            />

            <NumberInput
              label="Down Payment"
              value={values.downPayment}
              onChange={(val) => handleValueChange('downPayment', val || 0)}
              prefix="$"
              thousandSeparator=","
            />

            <NumberInput
              label="Loan Amount"
              value={values.loanAmount}
              onChange={(val) => handleValueChange('loanAmount', val || 0)}
              prefix="$"
              thousandSeparator=","
            />

            <NumberInput
              label="Interest Rate"
              value={values.interestRate}
              onChange={(val) => handleValueChange('interestRate', val || 0)}
              suffix="%"
              decimalScale={3}
            />

            <Select
              label="Loan Term"
              value={values.loanTerm.toString()}
              onChange={(val) => handleValueChange('loanTerm', parseInt(val || '30'))}
              data={[
                { value: '15', label: '15 years' },
                { value: '30', label: '30 years' },
              ]}
            />

            <NumberInput
              label="Property Tax (yearly)"
              value={values.propertyTax}
              onChange={(val) => handleValueChange('propertyTax', val || 0)}
              prefix="$"
              thousandSeparator=","
            />

            <NumberInput
              label="PMI Rate"
              value={values.pmi}
              onChange={(val) => handleValueChange('pmi', val || 0)}
              suffix="%"
              decimalScale={2}
            />

            <NumberInput
              label="Home Insurance (yearly)"
              value={values.homeInsurance}
              onChange={(val) => handleValueChange('homeInsurance', val || 0)}
              prefix="$"
              thousandSeparator=","
            />

            <NumberInput
              label="Monthly HOA"
              value={values.monthlyHOA}
              onChange={(val) => handleValueChange('monthlyHOA', val || 0)}
              prefix="$"
              thousandSeparator=","
            />
          </Stack>

          <Stack gap="md" style={{ flex: 1 }}>
            <Paper withBorder p="md">
              <Title order={3}>Monthly Payment Breakdown</Title>
              <Stack gap="xs" mt="md">
                <Group justify="space-between">
                  <Text>Principal & Interest:</Text>
                  <Text>${currentMonthlyPayment.principalAndInterest.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Property Tax:</Text>
                  <Text>${currentMonthlyPayment.tax.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>PMI:</Text>
                  <Text>${currentMonthlyPayment.pmi.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Home Insurance:</Text>
                  <Text>${currentMonthlyPayment.insurance.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>HOA:</Text>
                  <Text>${currentMonthlyPayment.hoa.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between" mt="md">
                  <Text fw={700}>Total Monthly Payment:</Text>
                  <Text fw={700}>${currentMonthlyPayment.total.toFixed(2)}</Text>
                </Group>
              </Stack>
            </Paper>

            <MortgageChart data={calculateAmortizationSchedule} />
          </Stack>
        </Group>
      </Stack>

      {/* Save Mortgage Modal */}
      <Modal opened={showSaveModal} onClose={() => setShowSaveModal(false)} title="Save Mortgage">
        <Stack spacing="md">
          <TextInput
            label="Mortgage Name"
            placeholder="Enter a name for this mortgage"
            value={mortgageName}
            onChange={(e) => setMortgageName(e.target.value)}
          />
          <Group position="right">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMortgage} disabled={!mortgageName.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Load Mortgage Modal */}
      <Modal opened={showLoadModal} onClose={() => setShowLoadModal(false)} title="Load Saved Mortgage" size="lg">
        <Stack spacing="md">
          {savedMortgages.length === 0 ? (
            <Text color="dimmed" align="center" py="xl">
              No saved mortgages found
            </Text>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Loan Type</th>
                  <th>Rate</th>
                  <th>Monthly Payment</th>
                  <th>Saved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedMortgages.map((mortgage) => (
                  <tr key={mortgage.id}>
                    <td>{mortgage.name}</td>
                    <td>
                      <Badge variant="light" color={mortgage.loanType === 'purchase' ? 'blue' : 'green'}>
                        {mortgage.loanType}
                      </Badge>
                    </td>
                    <td>{mortgage.interestRate}%</td>
                    <td>${calculateMonthlyPayment(mortgage.interestRate).total.toFixed(2)}</td>
                    <td>{new Date(mortgage.savedAt).toLocaleDateString()}</td>
                    <td>
                      <Group spacing="xs">
                        <Button size="xs" onClick={() => handleLoadMortgage(mortgage)}>
                          Load
                        </Button>
                        <Button size="xs" color="red" variant="outline" onClick={() => handleDeleteMortgage(mortgage.id)}>
                          Delete
                        </Button>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Stack>
      </Modal>

      {/* Rate Comparison Modal */}
      <Modal opened={showCompareModal} onClose={() => setShowCompareModal(false)} title="Rate Comparison" size="xl">
        <Stack spacing="md">
          <Text size="sm" color="dimmed">
            Comparing rates for a ${values.loanAmount.toLocaleString()} loan over {values.loanTerm} years
          </Text>
          <Table>
            <thead>
              <tr>
                <th>Interest Rate</th>
                <th>Monthly Payment</th>
                <th>Total Interest</th>
                <th>Monthly Savings</th>
                <th>Annual Savings</th>
              </tr>
            </thead>
            <tbody>
              {rateComparisons.map((comparison) => (
                <tr key={comparison.rate} style={{
                  backgroundColor: comparison.rate === values.interestRate ? '#f0f9ff' : undefined
                }}>
                  <td>
                    <Text weight={comparison.rate === values.interestRate ? 700 : 400}>
                      {comparison.rate.toFixed(2)}%
                    </Text>
                  </td>
                  <td>${comparison.monthlyPayment.toFixed(2)}</td>
                  <td>${comparison.totalInterest.toLocaleString()}</td>
                  <td>
                    <Text color={comparison.savings > 0 ? 'green' : 'red'}>
                      {comparison.savings > 0 ? '+' : ''}${comparison.savings.toFixed(2)}
                    </Text>
                  </td>
                  <td>
                    <Text color={comparison.savings > 0 ? 'green' : 'red'}>
                      {comparison.savings > 0 ? '+' : ''}${(comparison.savings * 12).toFixed(2)}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Stack>
      </Modal>
    </Paper>
  );
} 