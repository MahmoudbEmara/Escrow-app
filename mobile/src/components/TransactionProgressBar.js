import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

const STEPS = [
  { id: 1, label: 'Accepted', key: 'accepted' },
  { id: 2, label: 'Money in escrow', key: 'funded' },
  { id: 3, label: 'Delivery', key: 'delivery' },
  { id: 4, label: 'Money released', key: 'released' },
  { id: 5, label: 'Completed', key: 'completed' },
];

const getStepStatus = (transactionStatus, stepKey) => {
  const stepIndex = STEPS.findIndex(s => s.key === stepKey);
  
  if (transactionStatus === 'cancelled' || transactionStatus === 'disputed') {
    return 'disabled';
  }

  let completedUpToStep = -1;
  let currentStepIndex = -1;
  
  switch (transactionStatus) {
    case 'draft':
    case 'pending_approval':
      completedUpToStep = -1;
      currentStepIndex = 0;
      break;
    case 'accepted':
      completedUpToStep = 0;
      currentStepIndex = 1;
      break;
    case 'funded':
      completedUpToStep = 1;
      currentStepIndex = 2;
      break;
    case 'in_progress':
      completedUpToStep = 1;
      currentStepIndex = 2;
      break;
    case 'delivered':
      completedUpToStep = 2;
      currentStepIndex = 3;
      break;
    case 'completed':
      completedUpToStep = 4;
      currentStepIndex = 4;
      break;
    default:
      completedUpToStep = -1;
      currentStepIndex = 0;
  }

  if (stepIndex <= completedUpToStep) {
    return 'completed';
  } else if (stepIndex === currentStepIndex) {
    return 'current';
  } else {
    return 'pending';
  }
};

export default function TransactionProgressBar({ status }) {
  const transactionStatus = status || 'draft';

  const currentStepIndex = STEPS.findIndex(step => getStepStatus(transactionStatus, step.key) === 'current');
  const activeStepIndex = currentStepIndex >= 0 ? currentStepIndex : -1;

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const stepStatus = getStepStatus(transactionStatus, step.key);
        const isCompleted = stepStatus === 'completed';
        const isCurrent = stepStatus === 'current';
        const isPending = stepStatus === 'pending';
        const isDisabled = stepStatus === 'disabled';

        const circleColor = isCompleted || isCurrent ? '#00a63e' : '#d1d5dc';
        const lineColor = (activeStepIndex >= 0 && index < activeStepIndex) ? '#00a63e' : '#d1d5dc';
        const textColor = isCurrent ? '#364153' : (isPending || isDisabled ? '#99a1af' : '#364153');

        return (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <View style={styles.stepCircleContainer}>
                {isCurrent && (
                  <View style={styles.chevronContainer}>
                    <ChevronDown size={16} color="#00a63e" />
                  </View>
                )}
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isCompleted ? '#00a63e' : isCurrent ? '#ffffff' : '#d1d5dc',
                      borderWidth: isCurrent ? 2 : 0,
                      borderColor: isCurrent ? '#00a63e' : 'transparent',
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Check size={16} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        {
                          color: isCurrent ? '#00a63e' : '#ffffff',
                        },
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: lineColor },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                { color: textColor },
                step.label === 'Money in escrow' && styles.stepLabelMultiLine,
                step.label === 'Money released' && styles.stepLabelMultiLine,
              ]}
              numberOfLines={2}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  stepContainer: {
    alignItems: 'center',
    width: 67,
    minHeight: 100,
    position: 'relative',
    overflow: 'visible',
  },
  stepContent: {
    position: 'relative',
    width: 67,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  connector: {
    position: 'absolute',
    left: 53.5,
    top: 19,
    width: 27,
    height: 2,
    zIndex: 0,
  },
  stepCircleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  chevronContainer: {
    position: 'absolute',
    top: -24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 17,
    color: '#364153',
  },
  stepLabelMultiLine: {
    width: 50,
  },
});

