import { useState, useMemo, useEffect, useRef } from 'react';
import { TextInput, NumberInput, Select, Stack, Title, Paper, Group, Text, Button, Modal, Table, Badge, Divider } from '@mantine/core';
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

interface RefiAnalysis {
  currentPayment: number;
  newPayment: number;
  monthlySavings: number;
  closingCosts: number;
  breakEvenMonths: number;
  breakEvenDate: string;
  totalSavings5Years: number;
  totalSavings10Years: number;
  totalSavingsLifeOfLoan: number;
  isWorthIt: boolean;
}

export function MortgageCalculator() {
  const [values, setValues] = useState<MortgageValues>({
    homeValue: 1000000,
    downPayment: 200000,
    loanAmount: 800000,
    interestRate: 6.48,
    loanTerm: 30,
    propertyTax: 10100,
    pmi: 0.5,
    homeInsurance: 1500,
    monthlyHOA: 0,
    loanType: 'purchase',
  });

  const [savedMortgages, setSavedMortgages] = useState<SavedMortgage[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showRefiModal, setShowRefiModal] = useState(false);
  const [mortgageName, setMortgageName] = useState('');
  const [rateComparisons, setRateComparisons] = useState<RateComparison[]>([]);
  const [refiAnalysis, setRefiAnalysis] = useState<RefiAnalysis | null>(null);

  // Refinance analysis inputs
  const [refiInputs, setRefiInputs] = useState({
    currentBalance: 300000,
    newRate: 5.5,
    newTerm: 30,
    closingCosts: 5000,
    yearsOwned: 2,
  });

  // Calculate remaining loan term based on current loan
  const calculateRemainingTerm = () => {
    const yearsPaid = refiInputs.yearsOwned;
    return Math.max(0, values.loanTerm - yearsPaid);
  };

  // Load saved mortgages from localStorage on component mount
  useEffect(() => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.error('localStorage is not available');
        return;
      }
      
      const saved = localStorage.getItem('savedMortgages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSavedMortgages(parsed);
        } else {
          console.error('Saved mortgages is not an array:', parsed);
        }
      }
    } catch (error) {
      console.error('Error loading saved mortgages:', error);
    }
  }, []);

  // Save mortgages to localStorage whenever savedMortgages changes
  useEffect(() => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.error('localStorage is not available');
        return;
      }
      
      // Don't save on initial load when savedMortgages is empty
      // This prevents overwriting existing data with an empty array
      if (savedMortgages.length === 0) {
        return;
      }

      localStorage.setItem('savedMortgages', JSON.stringify(savedMortgages));
    } catch (error) {
      console.error('Error saving mortgages to localStorage:', error);
    }
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

  const calculateMonthlyPayment = (rate?: number, term?: number, principal?: number) => {
    const loanPrincipal = principal || values.loanAmount;
    const loanTerm = term || values.loanTerm;
    const monthlyInterestRate = (rate || values.interestRate) / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    // Monthly P&I payment using the mortgage payment formula
    const monthlyPI =
      (loanPrincipal *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    // Monthly property tax
    const monthlyTax = values.propertyTax / 12;

    // Monthly PMI (if down payment is less than 20%)
    const monthlyPMI =
      values.downPayment / values.homeValue < 0.2
        ? (loanPrincipal * (values.pmi / 100)) / 12
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

  const calculateTotalInterest = (rate?: number, term?: number, principal?: number) => {
    const monthlyPayment = calculateMonthlyPayment(rate, term, principal).principalAndInterest;
    const loanTerm = term || values.loanTerm;
    const totalPayments = monthlyPayment * loanTerm * 12;
    const loanPrincipal = principal || values.loanAmount;
    return totalPayments - loanPrincipal;
  };

  // Helper function to safely format numbers
  const safeToFixed = (value: number | undefined | null, decimals: number = 2): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(decimals);
  };

  // Helper function to format numbers with commas
  const formatWithCommas = (value: number | undefined | null, decimals: number = 2): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
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
    
    console.log('Saving new mortgage:', newMortgage);
    setSavedMortgages(prev => {
      const updated = [...prev, newMortgage];
      console.log('Updated saved mortgages:', updated);
      return updated;
    });
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
    
    // Generate comparisons for rates from -2% to +2% in 0.125% increments (more precise)
    for (let rateOffset = -2; rateOffset <= 2; rateOffset += 0.125) {
      const rate = Math.round((currentRate + rateOffset) * 1000) / 1000; // Round to 3 decimal places
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

  const calculateRefiAnalysis = () => {
    const currentPayment = calculateMonthlyPayment(values.interestRate, values.loanTerm, refiInputs.currentBalance).total;
    const newPayment = calculateMonthlyPayment(refiInputs.newRate, refiInputs.newTerm, refiInputs.currentBalance).total;
    const monthlySavings = currentPayment - newPayment;
    
    // Calculate break-even point
    const breakEvenMonths = refiInputs.closingCosts / monthlySavings;
    const breakEvenDate = new Date();
    breakEvenDate.setMonth(breakEvenDate.getMonth() + Math.ceil(breakEvenMonths));
    
    // Calculate total savings over different time periods
    const totalSavings5Years = (monthlySavings * 60) - refiInputs.closingCosts;
    const totalSavings10Years = (monthlySavings * 120) - refiInputs.closingCosts;
    
    // Calculate savings over the life of the new loan
    const newLoanTerm = refiInputs.newTerm;
    const totalSavingsLifeOfLoan = (monthlySavings * newLoanTerm * 12) - refiInputs.closingCosts;
    
    // Determine if refinancing is worth it (break-even within 2 years)
    const isWorthIt = breakEvenMonths <= 24 && monthlySavings > 0;
    
    const analysis: RefiAnalysis = {
      currentPayment,
      newPayment,
      monthlySavings,
      closingCosts: refiInputs.closingCosts,
      breakEvenMonths,
      breakEvenDate: breakEvenDate.toLocaleDateString(),
      totalSavings5Years,
      totalSavings10Years,
      totalSavingsLifeOfLoan,
      isWorthIt,
    };
    
    setRefiAnalysis(analysis);
    setShowRefiModal(true);
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
            <Button variant="outline" onClick={() => setShowRefiModal(true)}>
              Refi Analysis
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
                  <Text>${formatWithCommas(currentMonthlyPayment.principalAndInterest)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Property Tax:</Text>
                  <Text>${formatWithCommas(currentMonthlyPayment.tax)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>PMI:</Text>
                  <Text>${formatWithCommas(currentMonthlyPayment.pmi)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Home Insurance:</Text>
                  <Text>${formatWithCommas(currentMonthlyPayment.insurance)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>HOA:</Text>
                  <Text>${formatWithCommas(currentMonthlyPayment.hoa)}</Text>
                </Group>
                <Group justify="space-between" mt="md">
                  <Text fw={700}>Total Monthly Payment:</Text>
                  <Text fw={700}>${formatWithCommas(currentMonthlyPayment.total)}</Text>
                </Group>
              </Stack>
            </Paper>

            <MortgageChart 
              data={calculateAmortizationSchedule} 
              onBarClick={(yearData) => {
                // Calculate remaining years from the clicked year
                const remainingYears = values.loanTerm - yearData.year;
                
                // Prepopulate refi analysis with data from the clicked year
                setRefiInputs(prev => ({
                  ...prev,
                  currentBalance: Math.round(yearData.balance * 100) / 100, // Round to hundredth
                  newRate: values.interestRate - 0.5, // Default to 0.5% lower than current rate
                  newTerm: remainingYears, // Set to remaining term
                  yearsOwned: yearData.year, // Update years owned
                }));
                // Clear any previous analysis and start fresh
                setRefiAnalysis(null);
                setShowRefiModal(true);
              }}
            />
          </Stack>
        </Group>
      </Stack>

      {/* Save Mortgage Modal */}
      <Modal opened={showSaveModal} onClose={() => setShowSaveModal(false)} title="Save Mortgage">
        <Stack gap="md">
          <TextInput
            label="Mortgage Name"
            placeholder="Enter a name for this mortgage"
            value={mortgageName}
            onChange={(e) => setMortgageName(e.target.value)}
          />
          <Group justify="flex-end">
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
        <Stack gap="md">
          {savedMortgages.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
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
                    <td>${formatWithCommas(calculateMonthlyPayment(mortgage.interestRate).total)}</td>
                    <td>{new Date(mortgage.savedAt).toLocaleDateString()}</td>
                    <td>
                      <Group gap="xs">
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
        <Stack gap="md">
          <Text size="sm" c="dimmed">
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
                    <Text fw={comparison.rate === values.interestRate ? 700 : 400}>
                      {safeToFixed(comparison.rate, 3)}%
                    </Text>
                  </td>
                  <td>${formatWithCommas(comparison.monthlyPayment)}</td>
                  <td>${comparison.totalInterest.toLocaleString()}</td>
                  <td>
                    <Text c={comparison.savings > 0 ? 'green' : 'red'}>
                      {comparison.savings > 0 ? '+' : ''}${formatWithCommas(comparison.savings)}
                    </Text>
                  </td>
                  <td>
                    <Text c={comparison.savings > 0 ? 'green' : 'red'}>
                      {comparison.savings > 0 ? '+' : ''}${formatWithCommas(comparison.savings * 12)}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Stack>
      </Modal>

      {/* Refinance Analysis Modal */}
      <Modal opened={showRefiModal} onClose={() => setShowRefiModal(false)} title="Refinance Analysis" size="xl">
        <Stack gap="lg">
          {!refiAnalysis ? (
            <>
              <Text size="sm" c="dimmed">
                Enter your current loan details and the new refinance terms to see if refinancing makes sense.
              </Text>
              
              <Group grow>
                <NumberInput
                  label="Current Loan Balance"
                  value={refiInputs.currentBalance}
                  onChange={(val) => setRefiInputs(prev => ({ ...prev, currentBalance: Number(val) || 0 }))}
                  prefix="$"
                  thousandSeparator=","
                />
                <NumberInput
                  label="New Interest Rate"
                  value={refiInputs.newRate}
                  onChange={(val) => setRefiInputs(prev => ({ ...prev, newRate: Number(val) || 0 }))}
                  suffix="%"
                  decimalScale={3}
                />
              </Group>
              
              <Group grow>
                <NumberInput
                  label="Years Owned"
                  value={refiInputs.yearsOwned}
                  onChange={(val) => setRefiInputs(prev => ({ ...prev, yearsOwned: Number(val) || 0 }))}
                  min={0}
                  max={values.loanTerm}
                />
                <NumberInput
                  label="Closing Costs"
                  value={refiInputs.closingCosts}
                  onChange={(val) => setRefiInputs(prev => ({ ...prev, closingCosts: Number(val) || 0 }))}
                  prefix="$"
                  thousandSeparator=","
                />
              </Group>
              
              <Group grow>
                <Select
                  label="New Loan Term"
                  value={refiInputs.newTerm.toString()}
                  onChange={(val) => setRefiInputs(prev => ({ ...prev, newTerm: parseInt(val || '30') }))}
                  data={(() => {
                    const remainingTerm = calculateRemainingTerm();
                    const standardTerms = [15, 20, 30];
                    
                    // Create options array, avoiding duplicates
                    const options = [];
                    
                    // Add remaining term option if it's valid and unique
                    if (remainingTerm > 0 && !standardTerms.includes(remainingTerm)) {
                      options.push({ 
                        value: remainingTerm.toString(), 
                        label: `${remainingTerm} years (current remaining)` 
                      });
                    }
                    
                    // Add standard terms
                    standardTerms.forEach(term => {
                      options.push({ 
                        value: term.toString(), 
                        label: `${term} years${term === remainingTerm ? ' (current remaining)' : ''}` 
                      });
                    });
                    
                    return options;
                  })()}
                />
              </Group>
              
              <Group justify="center">
                <Button onClick={calculateRefiAnalysis} size="lg">
                  Analyze Refinance
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Paper withBorder p="md">
                <Group justify="space-between" align="center" mb="md">
                  <Title order={3}>Refinance Recommendation</Title>
                  <Badge 
                    size="lg" 
                    color={refiAnalysis.isWorthIt ? 'green' : 'red'}
                    variant="filled"
                  >
                    {refiAnalysis.isWorthIt ? 'WORTH IT' : 'NOT WORTH IT'}
                  </Badge>
                </Group>
                
                {/* Explanation */}
                <Paper p="sm" withBorder mb="md" bg={refiAnalysis.isWorthIt ? 'green.0' : 'red.0'}>
                  <Text size="sm" fw={500} c={refiAnalysis.isWorthIt ? 'green.7' : 'red.7'}>
                    {refiAnalysis.isWorthIt 
                      ? `✅ You'll break even in ${refiAnalysis.breakEvenMonths.toFixed(1)} months and save $${formatWithCommas(refiAnalysis.monthlySavings)} monthly.`
                      : refiAnalysis.monthlySavings <= 0
                        ? `❌ Your monthly payment would increase by $${formatWithCommas(Math.abs(refiAnalysis.monthlySavings))}.`
                        : `❌ Break-even takes ${refiAnalysis.breakEvenMonths.toFixed(1)} months (industry standard is 24 months).`
                    }
                  </Text>
                </Paper>
                
                <Stack gap="md">
                  <Group grow>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">Current Payment</Text>
                      <Text fw={700} size="lg">${formatWithCommas(refiAnalysis.currentPayment)}</Text>
                    </Paper>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">New Payment</Text>
                      <Text fw={700} size="lg" c="green">${formatWithCommas(refiAnalysis.newPayment)}</Text>
                    </Paper>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">Monthly Savings</Text>
                      <Text fw={700} size="lg" c="green">${formatWithCommas(refiAnalysis.monthlySavings)}</Text>
                    </Paper>
                  </Group>
                  
                  <Divider />
                  
                  <Group grow>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">Break-even Time</Text>
                      <Text fw={700}>{safeToFixed(refiAnalysis.breakEvenMonths, 1)} months</Text>
                      <Text size="sm" c="dimmed">({refiAnalysis.breakEvenDate})</Text>
                    </Paper>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">Closing Costs</Text>
                      <Text fw={700}>${refiAnalysis.closingCosts.toLocaleString()}</Text>
                    </Paper>
                  </Group>
                  
                  <Divider />
                  
                  <Title order={4}>Total Savings Over Time</Title>
                  <Group grow>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">5 Years</Text>
                      <Text fw={700} c={refiAnalysis.totalSavings5Years > 0 ? 'green' : 'red'}>
                        ${formatWithCommas(refiAnalysis.totalSavings5Years, 0)}
                      </Text>
                    </Paper>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">10 Years</Text>
                      <Text fw={700} c={refiAnalysis.totalSavings10Years > 0 ? 'green' : 'red'}>
                        ${formatWithCommas(refiAnalysis.totalSavings10Years, 0)}
                      </Text>
                    </Paper>
                    <Paper p="sm" withBorder>
                      <Text size="sm" c="dimmed">Life of Loan</Text>
                      <Text fw={700} c={refiAnalysis.totalSavingsLifeOfLoan > 0 ? 'green' : 'red'}>
                        ${formatWithCommas(refiAnalysis.totalSavingsLifeOfLoan, 0)}
                      </Text>
                    </Paper>
                  </Group>
                </Stack>
              </Paper>
              
              <Group justify="space-between">
                <Button variant="outline" onClick={() => setRefiAnalysis(null)}>
                  New Analysis
                </Button>
                <Button onClick={() => setShowRefiModal(false)}>
                  Close
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Paper>
  );
} 