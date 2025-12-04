/**
 * Componente para mostrar los pasos del checkout
 */

import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

export type CheckoutStep = 'address' | 'delivery' | 'payment' | 'summary';

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
  className?: string;
}

const steps: { key: CheckoutStep; label: string }[] = [
  { key: 'address', label: 'Dirección' },
  { key: 'delivery', label: 'Entrega' },
  { key: 'payment', label: 'Pago' },
  { key: 'summary', label: 'Resumen' },
];

export default function CheckoutSteps({ currentStep, className = '' }: CheckoutStepsProps) {
  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className={`flex items-center justify-between mb-8 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCompleted
                  ? 'bg-green-600 border-green-600 text-white'
                  : isCurrent
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>
              <span className={`mt-2 text-sm font-medium ${
                isCurrent ? 'text-black' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                isCompleted ? 'bg-green-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

