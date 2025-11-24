import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { LanguageContext } from '../context/LanguageContext';

const STEPS = [
  { id: 1, labelKey: 'progressAccepted', key: 'accepted' },
  { id: 2, labelKey: 'progressMoneyInEscrow', key: 'funded' },
  { id: 3, labelKey: 'progressDelivery', key: 'delivery' },
  { id: 4, labelKey: 'progressDeliveryAcceptance', key: 'delivery_acceptance' },
  { id: 5, labelKey: 'progressMoneyReleased', key: 'released' },
  { id: 6, labelKey: 'progressCompleted', key: 'completed' },
];

const getStepStatus = (transactionStatus, stepKey) => {
  const stepIndex = STEPS.findIndex(s => s.key === stepKey);
  
  if (transactionStatus === 'cancelled') {
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
    case 'disputed':
      if (stepKey === 'delivery_acceptance') {
        return 'disputed';
      }
      completedUpToStep = 2;
      currentStepIndex = 3;
      break;
    case 'delivered':
      completedUpToStep = 2;
      currentStepIndex = 3;
      break;
    case 'completed':
      completedUpToStep = 5;
      currentStepIndex = 5;
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

export default function TransactionProgressBar({ status, isRTL = false }) {
  const { t } = useContext(LanguageContext);
  const transactionStatus = status || 'draft';

  const currentStepIndex = STEPS.findIndex(step => getStepStatus(transactionStatus, step.key) === 'current');
  const activeStepIndex = currentStepIndex >= 0 ? currentStepIndex : -1;

  const displaySteps = isRTL ? [...STEPS].reverse() : STEPS;

  return (
    <View style={styles.container}>
      {displaySteps.map((step, displayIndex) => {
        const originalIndex = isRTL ? STEPS.length - 1 - displayIndex : displayIndex;
        const stepStatus = getStepStatus(transactionStatus, step.key);
        const isCompleted = stepStatus === 'completed';
        const isCurrent = stepStatus === 'current';
        const isPending = stepStatus === 'pending';
        const isDisabled = stepStatus === 'disabled';
        const isDisputed = stepStatus === 'disputed';

        const circleColor = isDisputed ? '#dc2626' : (isCompleted || isCurrent ? '#00a63e' : '#d1d5dc');
        
        let lineColor = '#d1d5dc';
        if (displayIndex < displaySteps.length - 1) {
          if (transactionStatus === 'completed') {
            lineColor = '#00a63e';
          } else if (transactionStatus === 'disputed') {
            const currentStepIndex = originalIndex;
            let nextStepIndex = -1;
            
            if (isRTL) {
              const nextDisplayIndex = displayIndex + 1;
              if (nextDisplayIndex < displaySteps.length) {
                nextStepIndex = STEPS.length - 1 - nextDisplayIndex;
              }
              
              if (nextStepIndex >= 0) {
                if ((currentStepIndex === 1 && nextStepIndex === 0) || (currentStepIndex === 2 && nextStepIndex === 1)) {
                  lineColor = '#00a63e';
                } else if (currentStepIndex === 3 && nextStepIndex === 2) {
                  lineColor = '#dc2626';
                }
              }
            } else {
              if (originalIndex + 1 < STEPS.length) {
                nextStepIndex = originalIndex + 1;
              }
              
              if (nextStepIndex >= 0 && nextStepIndex < STEPS.length) {
                if ((currentStepIndex === 0 && nextStepIndex === 1) || (currentStepIndex === 1 && nextStepIndex === 2)) {
                  lineColor = '#00a63e';
                } else if (currentStepIndex === 2 && nextStepIndex === 3) {
                  lineColor = '#dc2626';
                }
              }
            }
          } else if (activeStepIndex >= 0) {
            if (isRTL) {
              const nextDisplayIndex = displayIndex + 1;
              const nextOriginalIndex = STEPS.length - 1 - nextDisplayIndex;
              if (originalIndex <= activeStepIndex && nextOriginalIndex <= activeStepIndex) {
                const nextStep = STEPS[nextOriginalIndex];
                const nextStepDisputed = nextStep && nextStep.key === 'delivery_acceptance' && transactionStatus === 'disputed';
                lineColor = (isDisputed || nextStepDisputed) ? '#dc2626' : '#00a63e';
              }
            } else {
              if (originalIndex < activeStepIndex) {
                const nextStep = STEPS[originalIndex + 1];
                const nextStepDisputed = nextStep && nextStep.key === 'delivery_acceptance' && transactionStatus === 'disputed';
                lineColor = (isDisputed || nextStepDisputed) ? '#dc2626' : '#00a63e';
              }
            }
          }
        }
        
        const textColor = isDisputed ? '#dc2626' : (isCurrent ? '#364153' : (isPending || isDisabled ? '#99a1af' : '#364153'));

        return (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <View style={styles.stepCircleContainer}>
                {(isCurrent || isDisputed) && (
                  <View style={styles.chevronContainer}>
                    <ChevronDown 
                      size={16} 
                      color={isDisputed ? '#dc2626' : '#00a63e'} 
                      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} 
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isDisputed ? '#ffffff' : (isCompleted ? '#00a63e' : isCurrent ? '#ffffff' : '#d1d5dc'),
                      borderWidth: (isCurrent && !isCompleted) || isDisputed ? 2 : 0,
                      borderColor: isDisputed ? '#dc2626' : (isCurrent && !isCompleted ? '#00a63e' : 'transparent'),
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Check size={20} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        {
                          color: isDisputed ? '#dc2626' : (isCurrent ? '#00a63e' : '#ffffff'),
                        },
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
              </View>
              {displayIndex < displaySteps.length - 1 && (
                <View
                  style={[
                    isRTL ? styles.connectorRTL : styles.connector,
                    {
                      backgroundColor: lineColor,
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isRTL && styles.stepLabelRTL,
                {
                  color: textColor,
                },
              ]}
              numberOfLines={2}
            >
              {t(step.labelKey) || step.labelKey}
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
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
    overflow: 'visible',
  },
  stepContent: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
    height: 40,
    overflow: 'visible',
  },
  stepCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
  },
  chevronContainer: {
    position: 'absolute',
    top: -20,
    zIndex: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
    fontWeight: '600',
  },
  connector: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: 20,
    right: '-50%',
    marginRight: 20,
    height: 2,
    zIndex: 0,
  },
  connectorRTL: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: 20,
    right: '-50%',
    marginRight: 20,
    height: 2,
    zIndex: 0,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  stepLabelRTL: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});


