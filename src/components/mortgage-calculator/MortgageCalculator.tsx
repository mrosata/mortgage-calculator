import { useState, useMemo } from 'react';
import { TextInput, NumberInput, Select, Stack, Title, Paper, Group, Text } from '@mantine/core';
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
  });

  const handleValueChange = (field: keyof MortgageValues, value: number) => {
    setValues((prev) => {
      const newValues = { ...prev, [field]: value };
      
      // Update loan amount when home value or down payment changes
      if (field === 'homeValue' || field === 'downPayment') {
        newValues.loanAmount = newValues.homeValue - newValues.downPayment;
      }
      
      return newValues;
    });
  };

  const calculateMonthlyPayment = useMemo(() => {
    const principal = values.loanAmount;
    const monthlyInterestRate = values.interestRate / 100 / 12;
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
  }, [values]);

  const calculateAmortizationSchedule = useMemo(() => {
    const monthlyInterestRate = values.interestRate / 100 / 12;
    const numberOfPayments = values.loanTerm * 12;
    const monthlyPI = calculateMonthlyPayment.principalAndInterest;
    
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
  }, [values, calculateMonthlyPayment.principalAndInterest]);

  return (
    <Paper p="md" radius="md">
      <Stack spacing="lg">
        <Title order={2}>Mortgage Calculator</Title>

        <Group grow align="flex-start">
          <Stack spacing="md" style={{ flex: 1 }}>
            <NumberInput
              label="Home Value"
              value={values.homeValue}
              onChange={(val) => handleValueChange('homeValue', val || 0)}
              prefix="$"
              thousandsSeparator=","
            />

            <NumberInput
              label="Down Payment"
              value={values.downPayment}
              onChange={(val) => handleValueChange('downPayment', val || 0)}
              prefix="$"
              thousandsSeparator=","
            />

            <NumberInput
              label="Loan Amount"
              value={values.loanAmount}
              onChange={(val) => handleValueChange('loanAmount', val || 0)}
              prefix="$"
              thousandsSeparator=","
            />

            <NumberInput
              label="Interest Rate"
              value={values.interestRate}
              onChange={(val) => handleValueChange('interestRate', val || 0)}
              suffix="%"
              precision={2}
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
              thousandsSeparator=","
            />

            <NumberInput
              label="PMI Rate"
              value={values.pmi}
              onChange={(val) => handleValueChange('pmi', val || 0)}
              suffix="%"
              precision={2}
            />

            <NumberInput
              label="Home Insurance (yearly)"
              value={values.homeInsurance}
              onChange={(val) => handleValueChange('homeInsurance', val || 0)}
              prefix="$"
              thousandsSeparator=","
            />

            <NumberInput
              label="Monthly HOA"
              value={values.monthlyHOA}
              onChange={(val) => handleValueChange('monthlyHOA', val || 0)}
              prefix="$"
              thousandsSeparator=","
            />
          </Stack>

          <Stack spacing="md" style={{ flex: 1 }}>
            <Paper withBorder p="md">
              <Title order={3}>Monthly Payment Breakdown</Title>
              <Stack spacing="xs" mt="md">
                <Group position="apart">
                  <Text>Principal & Interest:</Text>
                  <Text>${calculateMonthlyPayment.principalAndInterest.toFixed(2)}</Text>
                </Group>
                <Group position="apart">
                  <Text>Property Tax:</Text>
                  <Text>${calculateMonthlyPayment.tax.toFixed(2)}</Text>
                </Group>
                <Group position="apart">
                  <Text>PMI:</Text>
                  <Text>${calculateMonthlyPayment.pmi.toFixed(2)}</Text>
                </Group>
                <Group position="apart">
                  <Text>Home Insurance:</Text>
                  <Text>${calculateMonthlyPayment.insurance.toFixed(2)}</Text>
                </Group>
                <Group position="apart">
                  <Text>HOA:</Text>
                  <Text>${calculateMonthlyPayment.hoa.toFixed(2)}</Text>
                </Group>
                <Group position="apart" mt="md">
                  <Text weight={700}>Total Monthly Payment:</Text>
                  <Text weight={700}>${calculateMonthlyPayment.total.toFixed(2)}</Text>
                </Group>
              </Stack>
            </Paper>

            <MortgageChart data={calculateAmortizationSchedule} />
          </Stack>
        </Group>
      </Stack>
    </Paper>
  );
} 