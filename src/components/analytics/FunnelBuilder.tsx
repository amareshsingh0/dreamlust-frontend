/**
 * Funnel Builder Component
 * Allows users to create and edit funnel steps
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export interface FunnelStep {
  event: string;
  filter?: 'all' | 'new_users' | 'returning' | 'premium';
  name?: string;
}

interface FunnelBuilderProps {
  steps: FunnelStep[];
  onChange: (steps: FunnelStep[]) => void;
}

export function FunnelBuilder({ steps, onChange }: FunnelBuilderProps) {
  const updateStep = (index: number, field: keyof FunnelStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange(newSteps);
  };

  const addStep = () => {
    onChange([...steps, { event: '', filter: 'all' }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onChange(newSteps);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel Steps</CardTitle>
        <CardDescription>Define the steps in your conversion funnel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-3 items-end p-4 border rounded-lg">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`step-${index}-name`}>Step {index + 1} Name (optional)</Label>
              <Input
                id={`step-${index}-name`}
                value={step.name || ''}
                onChange={(e) => updateStep(index, 'name', e.target.value)}
                placeholder={`Step ${index + 1}`}
              />
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor={`step-${index}-event`}>Event Name *</Label>
              <Input
                id={`step-${index}-event`}
                value={step.event}
                onChange={(e) => updateStep(index, 'event', e.target.value)}
                placeholder="e.g., page_view, signup, purchase"
                required
              />
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor={`step-${index}-filter`}>Filter</Label>
              <Select
                value={step.filter || 'all'}
                onValueChange={(value) => updateStep(index, 'filter', value)}
              >
                <SelectTrigger id={`step-${index}-filter`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="new_users">New Users</SelectItem>
                  <SelectItem value="returning">Returning</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeStep(index)}
              disabled={steps.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button onClick={addStep} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </CardContent>
    </Card>
  );
}


