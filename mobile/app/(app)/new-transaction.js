import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, ArrowLeft, ShoppingBag, Briefcase, Monitor, FileText, Info, User, Tag, Mail, DollarSign, CheckCircle, Calendar, Plus, Circle, X, Banknote } from 'lucide-react-native';
import { AuthContext } from '../../src/context/AuthContext';
import * as DatabaseService from '../../src/services/databaseService';
import { calculateTransactionFee, getFeePercentageDisplay } from '../../src/constants/fees';

export default function NewTransactionScreen() {
  const router = useRouter();
  const { state } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const step3ScrollViewRef = useRef(null);
  const step2ScrollViewRef = useRef(null);
  const [buyerInfoCardY, setBuyerInfoCardY] = useState(0);
  const [amountCardY, setAmountCardY] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    role: '',
    userId: '',
    userName: '',
    amount: '',
    terms: [''], // Changed to array, start with one empty term
    category: '',
    feesResponsibility: '',
    confirmed: false,
    deliveryDate: '',
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTransactionType, setSelectedTransactionType] = useState(null);
  const [otherPartyName, setOtherPartyName] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);
  const [otherPartyId, setOtherPartyId] = useState(null);


  const maskUserId = (userId) => {
    if (!userId) return '';
    if (userId.length <= 4) return userId;
    return '****' + userId.slice(-4);
  };

  const maskName = (name) => {
    if (!name) return '';
    const words = name.trim().split(/\s+/);
    if (words.length === 0) return '';
    
    // First word is fully visible
    const firstWord = words[0];
    
    // For each word after the first, show only first letter + asterisks
    const maskedWords = words.slice(1).map(word => {
      if (word.length === 0) return '';
      const firstLetter = word[0];
      const asterisks = '*'.repeat(word.length - 1);
      return firstLetter + asterisks;
    });
    
    // Combine first word with masked words
    return [firstWord, ...maskedWords].join(' ');
  };

  const handleUserIdChange = (text) => {
    setFormData({ ...formData, userId: text });
    setOtherPartyName(''); // Clear name when input changes
    setOtherPartyId(null); // Clear ID when input changes
  };

  // Debounced user lookup to fetch full name
  useEffect(() => {
    if (!formData.userId || !formData.userId.trim()) {
      setOtherPartyName('');
      setOtherPartyId(null);
      setCheckingUser(false);
      return;
    }

    const trimmedIdentifier = formData.userId.trim();
    setCheckingUser(true);

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      try {
        const result = await DatabaseService.findUserByIdentifier(trimmedIdentifier);
        
        if (result.error || !result.data) {
          setOtherPartyName('');
          setOtherPartyId(null);
        } else {
          // Check if user is trying to create transaction with themselves
          if (result.data.id === state.user?.id) {
            setOtherPartyName('');
            setOtherPartyId(null);
            return;
          }
          
          setOtherPartyId(result.data.id);
          // Get the user's profile to get their full name
          const profileResult = await DatabaseService.getUserProfile(result.data.id);
          if (profileResult.data?.name) {
            setOtherPartyName(profileResult.data.name);
          } else {
            setOtherPartyName('');
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setOtherPartyName('');
        setOtherPartyId(null);
      } finally {
        setCheckingUser(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.userId, state.user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      setCurrentStep(1);
      setSelectedTransactionType(null);
      setFormData({
        title: '',
        role: '',
        userId: '',
        userName: '',
        amount: '',
        terms: [''],
        category: '',
        feesResponsibility: '',
        confirmed: false,
        deliveryDate: '',
      });
      setOtherPartyName('');
      setOtherPartyId(null);
      setIsSubmitting(false);
      setCheckingUser(false);
    }, [])
  );

  const handleTermChange = (index, text) => {
    const newTerms = [...formData.terms];
    newTerms[index] = text;
    setFormData({ ...formData, terms: newTerms });
  };

  const handleAddTerm = () => {
    const newTerms = [...formData.terms, ''];
    setFormData({ ...formData, terms: newTerms });
  };

  useEffect(() => {
    if (currentStep === 3 && step3ScrollViewRef.current) {
      setTimeout(() => {
        step3ScrollViewRef.current?.scrollTo({
          y: 0,
          animated: false
        });
      }, 100);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 2) return;

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setTimeout(() => {
          if (step2ScrollViewRef.current) {
            step2ScrollViewRef.current.scrollTo({
              y: 0,
              animated: true
            });
          }
        }, 100);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [currentStep]);

  const handleRemoveTerm = (index) => {
    // Only allow removal if there's more than one term
    if (formData.terms.length > 1) {
      const newTerms = formData.terms.filter((_, i) => i !== index);
      setFormData({ ...formData, terms: newTerms });
    }
  };


  const handleConfirm = async () => {
    if (!formData.confirmed) {
      Alert.alert('Error', 'Please confirm that the information is correct');
      return;
    }

    if (!state.user?.id) {
      Alert.alert('Error', 'You must be logged in to create a transaction');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse delivery date (DD-MM-YYYY format)
      let deliveryDate = null;
      if (formData.deliveryDate && formData.deliveryDate.trim()) {
        // Remove dashes and parse DD-MM-YYYY format
        const dateStr = formData.deliveryDate.replace(/-/g, '');
        if (dateStr.length === 8) {
          // Format: DDMMYYYY
          const day = parseInt(dateStr.substring(0, 2));
          const month = parseInt(dateStr.substring(2, 4));
          const year = parseInt(dateStr.substring(4, 8));
          
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
            deliveryDate = new Date(year, month - 1, day).toISOString();
          } else {
            console.warn('Invalid date values:', { day, month, year });
          }
        } else {
          // Try parsing as ISO string or other format
          try {
            deliveryDate = new Date(formData.deliveryDate).toISOString();
          } catch (e) {
            console.warn('Could not parse delivery date:', formData.deliveryDate);
          }
        }
      }

      // Determine buyer_id and seller_id based on role
      let buyerId = state.user.id;
      let sellerId = state.user.id;

      if (formData.userId && formData.userId.trim()) {
        const otherPartyResult = await DatabaseService.findUserByIdentifier(formData.userId);
        
        if (otherPartyResult.error || !otherPartyResult.data) {
          Alert.alert(
            'User Not Found', 
            otherPartyResult.error || 'Could not find the other user. Please check the User ID or Email and try again.',
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }

        const otherPartyId = otherPartyResult.data.id;

        if (formData.role === 'Buyer') {
          // Current user is buyer, other party is seller
          sellerId = otherPartyId;
        } else {
          // Current user is seller, other party is buyer
          buyerId = otherPartyId;
        }
      }

      // Prepare transaction data
      // Note: created_at is automatically set by createTransaction function
      const transactionData = {
        title: formData.title,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: parseFloat(formData.amount),
        category: formData.category,
        fees_responsibility: formData.feesResponsibility,
        delivery_date: deliveryDate,
        status: 'pending', // or 'In Progress'
        // Store terms as JSON or in a separate table
        // For now, we'll store it as a text field if the schema supports it
        terms: formData.terms.filter(term => term.trim() !== '').join('\n'),
        // Set initiated_by to the current user (the one creating the transaction)
        initiated_by: state.user.id,
      };

      // Create the transaction
      const result = await DatabaseService.createTransaction(transactionData);

      if (result.error) {
        console.error('Transaction creation error:', result.error);
        Alert.alert('Error', result.error || 'Failed to create transaction. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success - Reset form state before navigating
      setFormData({
        title: '',
        role: '',
        userId: '',
        userName: '',
        amount: '',
        terms: [''],
        category: '',
        feesResponsibility: '',
        confirmed: false,
        deliveryDate: '',
      });
      setOtherPartyName('');
      setIsSubmitting(false);
      setCheckingUser(false);

      Alert.alert('Success', 'Transaction created successfully', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back to home page which will refresh and show the new transaction
            router.push('/(app)/home');
          }
        }
      ]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', error.message || 'Failed to create transaction. Please try again.');
      setIsSubmitting(false);
    }
  };

  const transactionTypes = [
    { id: 'product_sale', name: 'Product Sale', icon: ShoppingBag, color: '#2563eb', description: 'Quick setup' },
    { id: 'freelance_service', name: 'Freelance Service', icon: Briefcase, color: '#9333ea', description: 'Quick setup' },
    { id: 'digital_product', name: 'Digital Product', icon: Monitor, color: '#16a34a', description: 'Quick setup' },
    { id: 'custom', name: 'Custom', icon: FileText, color: '#ea580c', description: 'Quick setup' },
  ];

  const handleTransactionTypeSelect = (type) => {
    setSelectedTransactionType(type);
    setCurrentStep(2);
  };

  const handleStep2Continue = () => {
    if (!formData.role || !formData.title || !formData.userId || !formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (formData.userId && !otherPartyName && !checkingUser) {
      Alert.alert('Error', 'User not found. Please check the username or email and try again.');
      return;
    }
    setCurrentStep(3);
  };

  const handleStep3Create = async () => {
    if (!formData.confirmed) {
      Alert.alert('Error', 'Please confirm that you agree to the terms and conditions');
      return;
    }
    await handleConfirm();
  };

  if (currentStep === 1) {
    return (
      <View style={styles.step1Container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.step1Header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.step1HeaderContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.step1BackButton}>
              <ArrowLeft size={24} color="#101828" />
            </TouchableOpacity>
            <View style={styles.step1HeaderText}>
              <Text style={styles.step1Title}>New Transaction</Text>
              <Text style={styles.step1Subtitle}>Choose a transaction type</Text>
            </View>
          </View>
        </View>

        <View style={styles.step1ProgressSection}>
          <View style={styles.step1ProgressHeader}>
            <Text style={styles.step1ProgressText}>Step 1 of 3</Text>
            <Text style={styles.step1ProgressText}>33%</Text>
          </View>
          <View style={styles.step1ProgressBar}>
            <View style={[styles.step1ProgressFill, { width: '33%' }]} />
          </View>
        </View>

        <ScrollView 
          style={styles.step1ScrollView}
          contentContainerStyle={styles.step1ScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.step1Content}>
            <View style={styles.step1QuestionSection}>
              <Text style={styles.step1Question}>What type of transaction is this?</Text>
              <Text style={styles.step1Description}>
                Select a template to get started quickly with pre-filled terms
              </Text>
            </View>

            <View style={styles.step1Grid}>
              {transactionTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.step1TypeCard,
                      selectedTransactionType?.id === type.id && styles.step1TypeCardSelected
                    ]}
                    onPress={() => handleTransactionTypeSelect(type)}
                  >
                    <View style={[styles.step1TypeIconContainer, { backgroundColor: type.color + '15' }]}>
                      <IconComponent size={24} color={type.color} />
                    </View>
                    <Text style={styles.step1TypeName}>{type.name}</Text>
                    <Text style={styles.step1TypeDescription}>{type.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.step1InfoBox}>
              <Info size={20} color="#1c398e" />
              <Text style={styles.step1InfoText}>
                Templates include suggested terms that you can customize in the next step.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (currentStep === 2) {
    const transactionTypeName = selectedTransactionType?.name?.toLowerCase() || 'transaction';
    
    return (
      <View style={styles.step2Container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.step2Header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.step2HeaderContent}>
            <TouchableOpacity onPress={() => setCurrentStep(1)} style={styles.step2BackButton}>
              <ArrowLeft size={24} color="#101828" />
            </TouchableOpacity>
            <View style={styles.step2HeaderText}>
              <Text style={styles.step2Title}>Transaction Details</Text>
              <Text style={styles.step2Subtitle}>{transactionTypeName} transaction</Text>
            </View>
          </View>
        </View>

        <View style={styles.step2ProgressSection}>
          <View style={styles.step2ProgressHeader}>
            <Text style={styles.step2ProgressText}>Step 2 of 3</Text>
            <Text style={styles.step2ProgressText}>66%</Text>
          </View>
          <View style={styles.step2ProgressBar}>
            <View style={[styles.step2ProgressFill, { width: '66%' }]} />
          </View>
        </View>

        <ScrollView 
          ref={step2ScrollViewRef}
          style={styles.step2ScrollView}
          contentContainerStyle={styles.step2ScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.step2Content}>
            <View style={styles.step2Card}>
              <View style={styles.step2CardHeader}>
                <User size={20} color="#101828" />
                <Text style={styles.step2CardLabel}>Your Role</Text>
              </View>
              <View style={styles.step2RoleButtons}>
                <TouchableOpacity
                  style={[
                    styles.step2RoleButton,
                    formData.role === 'Buyer' && styles.step2RoleButtonSelected
                  ]}
                  onPress={() => setFormData({ ...formData, role: 'Buyer' })}
                >
                  <Text style={[
                    styles.step2RoleButtonText,
                    formData.role === 'Buyer' && styles.step2RoleButtonTextSelected
                  ]}>Buyer</Text>
                  <Text style={[
                    styles.step2RoleButtonSubtext,
                    formData.role === 'Buyer' && styles.step2RoleButtonSubtextSelected
                  ]}>Purchasing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.step2RoleButton,
                    formData.role === 'Seller' && styles.step2RoleButtonSelected
                  ]}
                  onPress={() => setFormData({ ...formData, role: 'Seller' })}
                >
                  <Text style={[
                    styles.step2RoleButtonText,
                    formData.role === 'Seller' && styles.step2RoleButtonTextSelected
                  ]}>Seller</Text>
                  <Text style={[
                    styles.step2RoleButtonSubtext,
                    formData.role === 'Seller' && styles.step2RoleButtonSubtextSelected
                  ]}>Selling</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.step2Card}>
              <View style={styles.step2CardHeader}>
                <Tag size={20} color="#101828" />
                <Text style={styles.step2CardLabel}>Transaction Title</Text>
              </View>
              <TextInput
                style={styles.step2Input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter transaction title"
                placeholderTextColor="rgba(10, 10, 10, 0.5)"
              />
              <Text style={styles.step2HelperText}>
                Give your transaction a clear, descriptive name
              </Text>
            </View>

            <View 
              style={styles.step2Card}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                setBuyerInfoCardY(y);
              }}
            >
              <View style={styles.step2CardHeader}>
                <Mail size={20} color="#101828" />
                <Text style={styles.step2CardLabel}>
                  {formData.role === 'Buyer' ? 'Seller' : 'Buyer'} Information
                </Text>
              </View>
              <TextInput
                style={styles.step2Input}
                value={formData.userId}
                onChangeText={handleUserIdChange}
                placeholder="Enter username or email"
                placeholderTextColor="rgba(10, 10, 10, 0.5)"
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => {
                  setTimeout(() => {
                    if (step2ScrollViewRef.current && buyerInfoCardY > 0) {
                      step2ScrollViewRef.current.scrollTo({
                        y: Math.max(0, buyerInfoCardY - 100),
                        animated: true
                      });
                    }
                  }, 300);
                }}
              />
              {checkingUser && (
                <View style={styles.step2CheckingContainer}>
                  <ActivityIndicator size="small" color="#6a7282" />
                  <Text style={styles.step2CheckingText}>Checking user...</Text>
                </View>
              )}
              {!checkingUser && otherPartyName && (
                <View style={styles.step2SuccessBox}>
                  <CheckCircle size={20} color="#008236" />
                  <View style={styles.step2SuccessTextContainer}>
                    <Text style={styles.step2SuccessTitle}>User found</Text>
                    <Text style={styles.step2SuccessName}>{otherPartyName}</Text>
                  </View>
                </View>
              )}
              {!checkingUser && formData.userId && !otherPartyName && (
                <View style={styles.step2ErrorBox}>
                  <X size={20} color="#ef4444" />
                  <View style={styles.step2ErrorTextContainer}>
                    <Text style={styles.step2ErrorTitle}>User not found</Text>
                    <Text style={styles.step2ErrorSubtext}>Please check the username or email and try again</Text>
                  </View>
                </View>
              )}
              {!checkingUser && formData.userId && otherPartyId === state.user?.id && (
                <View style={styles.step2ErrorBox}>
                  <X size={20} color="#ef4444" />
                  <View style={styles.step2ErrorTextContainer}>
                    <Text style={styles.step2ErrorTitle}>Cannot create transaction with yourself</Text>
                    <Text style={styles.step2ErrorSubtext}>Please enter a different user</Text>
                  </View>
                </View>
              )}
            </View>

            <View 
              style={styles.step2Card}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                setAmountCardY(y);
              }}
            >
              <View style={styles.step2CardHeader}>
                <Banknote size={20} color="#101828" />
                <Text style={styles.step2CardLabel}>Transaction Amount</Text>
              </View>
              <View style={styles.step2AmountInputContainer}>
                <Text style={styles.step2CurrencySymbol}>EGP</Text>
                <TextInput
                  style={styles.step2AmountInput}
                  value={formData.amount}
                  onChangeText={(text) => {
                    setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') });
                    setTimeout(() => {
                      if (step2ScrollViewRef.current && amountCardY > 0) {
                        step2ScrollViewRef.current.scrollTo({
                          y: Math.max(0, amountCardY - 100),
                          animated: true
                        });
                      }
                    }, 100);
                  }}
                  placeholder="0.00"
                  placeholderTextColor="rgba(10, 10, 10, 0.5)"
                  keyboardType="decimal-pad"
                  onFocus={() => {
                    setTimeout(() => {
                      if (step2ScrollViewRef.current && amountCardY > 0) {
                        step2ScrollViewRef.current.scrollTo({
                          y: Math.max(0, amountCardY - 100),
                          animated: true
                        });
                      }
                    }, 300);
                  }}
                />
              </View>
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <View style={styles.step2AmountBreakdown}>
                  <View style={styles.step2BreakdownRow}>
                    <Text style={styles.step2BreakdownLabel}>Amount:</Text>
                    <Text style={styles.step2BreakdownValue}>{parseFloat(formData.amount).toLocaleString()} EGP</Text>
                  </View>
                  <View style={styles.step2BreakdownRow}>
                    <Text style={styles.step2BreakdownLabel}>Service Fee:</Text>
                    <Text style={styles.step2BreakdownValue}>{calculateTransactionFee(parseFloat(formData.amount)).toFixed(2)} EGP</Text>
                  </View>
                  <View style={[styles.step2BreakdownRow, styles.step2BreakdownRowTotal]}>
                    <Text style={[styles.step2BreakdownLabel, styles.step2BreakdownLabelTotal]}>Total:</Text>
                    <Text style={[styles.step2BreakdownValue, styles.step2BreakdownValueTotal]}>
                      {(parseFloat(formData.amount) + calculateTransactionFee(parseFloat(formData.amount))).toFixed(2)} EGP
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.step2Footer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.step2ContinueButton,
              (!formData.role || !formData.title || !formData.userId || !formData.amount || (formData.userId && !otherPartyName && !checkingUser)) && styles.step2ContinueButtonDisabled
            ]}
            disabled={!formData.role || !formData.title || !formData.userId || !formData.amount || (formData.userId && !otherPartyName && !checkingUser)}
            onPress={handleStep2Continue}
          >
            <Text style={styles.step2ContinueButtonText}>Continue to Terms</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentStep === 3) {
    const serviceFee = formData.amount ? calculateTransactionFee(parseFloat(formData.amount)) : 0;
    const totalAmount = formData.amount ? parseFloat(formData.amount) + serviceFee : 0;
    const splitFee = serviceFee / 2;
    
    return (
      <View style={styles.step3Container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.step3Header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.step3HeaderContent}>
            <TouchableOpacity onPress={() => setCurrentStep(2)} style={styles.step3BackButton}>
              <ArrowLeft size={24} color="#101828" />
            </TouchableOpacity>
            <View style={styles.step3HeaderText}>
              <Text style={styles.step3Title}>Terms & Review</Text>
              <Text style={styles.step3Subtitle}>Final step</Text>
            </View>
          </View>
        </View>

        <View style={styles.step3ProgressSection}>
          <View style={styles.step3ProgressHeader}>
            <Text style={styles.step3ProgressText}>Step 3 of 3</Text>
            <Text style={styles.step3ProgressText}>100%</Text>
          </View>
          <View style={styles.step3ProgressBar}>
            <View style={[styles.step3ProgressFill, { width: '100%' }]} />
          </View>
        </View>

        <ScrollView 
          ref={step3ScrollViewRef}
          style={styles.step3ScrollView}
          contentContainerStyle={styles.step3ScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.step3Content}>
            <View style={styles.step3Card}>
              <View style={styles.step3CardHeader}>
                <FileText size={20} color="#101828" />
                <Text style={styles.step3CardLabel}>Transaction Terms</Text>
              </View>
              <View style={styles.step3TermsList}>
                {formData.terms.map((term, index) => (
                  <View key={index} style={styles.step3TermRow}>
                    <TextInput
                      style={styles.step3TermInput}
                      value={term}
                      onChangeText={(text) => handleTermChange(index, text)}
                      placeholder="Enter a term"
                      placeholderTextColor="rgba(10, 10, 10, 0.5)"
                    />
                    {formData.terms.length > 1 && (
                      <TouchableOpacity
                        style={styles.step3DeleteTermButton}
                        onPress={() => handleRemoveTerm(index)}
                      >
                        <Trash2 size={20} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.step3AddTermButton}
                onPress={() => {
                  const newTerms = [...formData.terms, ''];
                  setFormData({ ...formData, terms: newTerms });
                }}
              >
                <Plus size={16} color="#155dfc" />
                <Text style={styles.step3AddTermText}>Add Another Term</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.step3Card}>
              <View style={styles.step3CardHeader}>
                <Calendar size={20} color="#101828" />
                <Text style={styles.step3CardLabel}>Expected Delivery Date (Optional)</Text>
              </View>
              <TextInput
                style={styles.step3Input}
                value={formData.deliveryDate}
                onChangeText={(text) => {
                  const numbers = text.replace(/\D/g, '');
                  let formatted = numbers;
                  if (numbers.length > 2) {
                    formatted = numbers.substring(0, 2) + '-' + numbers.substring(2);
                  }
                  if (numbers.length > 4) {
                    formatted = numbers.substring(0, 2) + '-' + numbers.substring(2, 4) + '-' + numbers.substring(4, 8);
                  }
                  setFormData({ ...formData, deliveryDate: formatted });
                }}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="rgba(10, 10, 10, 0.5)"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.step3Card}>
              <View style={styles.step3CardHeader}>
                <Banknote size={20} color="#101828" />
                <Text style={styles.step3CardLabel}>Who Pays the Service Fee?</Text>
              </View>
              <View style={styles.step3FeeOptions}>
                <TouchableOpacity
                  style={[
                    styles.step3FeeOption,
                    formData.feesResponsibility === 'Buyer' && styles.step3FeeOptionSelected
                  ]}
                  onPress={() => setFormData({ ...formData, feesResponsibility: 'Buyer' })}
                >
                  <View style={styles.step3FeeOptionContent}>
                    <View style={[
                      styles.step3RadioButton,
                      formData.feesResponsibility === 'Buyer' && styles.step3RadioButtonSelected
                    ]}>
                      {formData.feesResponsibility === 'Buyer' && <View style={styles.step3RadioInner} />}
                    </View>
                    <Text style={[
                      styles.step3FeeOptionText,
                      formData.feesResponsibility === 'Buyer' && styles.step3FeeOptionTextSelected
                    ]}>Buyer pays</Text>
                  </View>
                  <Text style={styles.step3FeeAmount}>{serviceFee.toFixed(2)} EGP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.step3FeeOption,
                    formData.feesResponsibility === 'Seller' && styles.step3FeeOptionSelected
                  ]}
                  onPress={() => setFormData({ ...formData, feesResponsibility: 'Seller' })}
                >
                  <View style={styles.step3FeeOptionContent}>
                    <View style={[
                      styles.step3RadioButton,
                      formData.feesResponsibility === 'Seller' && styles.step3RadioButtonSelected
                    ]}>
                      {formData.feesResponsibility === 'Seller' && <View style={styles.step3RadioInner} />}
                    </View>
                    <Text style={[
                      styles.step3FeeOptionText,
                      formData.feesResponsibility === 'Seller' && styles.step3FeeOptionTextSelected
                    ]}>Seller pays</Text>
                  </View>
                  <Text style={styles.step3FeeAmount}>{serviceFee.toFixed(2)} EGP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.step3FeeOption,
                    formData.feesResponsibility === 'Split Fees' && styles.step3FeeOptionSelected
                  ]}
                  onPress={() => setFormData({ ...formData, feesResponsibility: 'Split Fees' })}
                >
                  <View style={styles.step3FeeOptionContent}>
                    <View style={[
                      styles.step3RadioButton,
                      formData.feesResponsibility === 'Split Fees' && styles.step3RadioButtonSelected
                    ]}>
                      {formData.feesResponsibility === 'Split Fees' && <View style={styles.step3RadioInner} />}
                    </View>
                    <Text style={[
                      styles.step3FeeOptionText,
                      formData.feesResponsibility === 'Split Fees' && styles.step3FeeOptionTextSelected
                    ]}>Split 50/50</Text>
                  </View>
                  <Text style={styles.step3FeeAmount}>{splitFee.toFixed(2)} EGP each</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.step3SummaryCard}>
              <View style={styles.step3SummaryHeader}>
                <CheckCircle size={20} color="#101828" />
                <Text style={styles.step3SummaryTitle}>Transaction Summary</Text>
              </View>
              <View style={styles.step3SummaryContent}>
                <View style={styles.step3SummaryRow}>
                  <Text style={styles.step3SummaryLabel}>Title:</Text>
                  <Text style={styles.step3SummaryValue}>{formData.title || '-'}</Text>
                </View>
                <View style={styles.step3SummaryRow}>
                  <Text style={styles.step3SummaryLabel}>Buyer:</Text>
                  <Text style={styles.step3SummaryValue}>
                    {formData.role === 'Buyer' ? 'You' : (otherPartyName || '-')}
                  </Text>
                </View>
                <View style={styles.step3SummaryRow}>
                  <Text style={styles.step3SummaryLabel}>Seller:</Text>
                  <Text style={styles.step3SummaryValue}>
                    {formData.role === 'Seller' ? 'You' : (otherPartyName || '-')}
                  </Text>
                </View>
                <View style={styles.step3SummaryRow}>
                  <Text style={styles.step3SummaryLabel}>Amount:</Text>
                  <Text style={styles.step3SummaryValue}>
                    {formData.amount ? parseFloat(formData.amount).toLocaleString() + ' EGP' : '0 EGP'}
                  </Text>
                </View>
                <View style={styles.step3SummaryRow}>
                  <Text style={styles.step3SummaryLabel}>Delivery:</Text>
                  <Text style={styles.step3SummaryValue}>
                    {formData.deliveryDate || '-'}
                  </Text>
                </View>
                <View style={styles.step3SummaryRow}>
                  <Text style={styles.step3SummaryLabel}>Fees:</Text>
                  <Text style={styles.step3SummaryValue}>
                    {formData.feesResponsibility ? formData.feesResponsibility.toLowerCase() : '-'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.step3AgreementCard}>
              <TouchableOpacity
                style={styles.step3CheckboxContainer}
                onPress={() => setFormData({ ...formData, confirmed: !formData.confirmed })}
              >
                <View style={[
                  styles.step3Checkbox,
                  formData.confirmed && styles.step3CheckboxChecked
                ]}>
                  {formData.confirmed && <Text style={styles.step3Checkmark}>✓</Text>}
                </View>
                <View style={styles.step3CheckboxTextContainer}>
                  <Text style={styles.step3CheckboxTitle}>
                    I agree to the terms and conditions
                  </Text>
                  <Text style={styles.step3CheckboxSubtext}>
                    By checking this box, you confirm that all information is correct and agree to the transaction terms.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.step3Footer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.step3CreateButton,
              (!formData.confirmed || isSubmitting) && styles.step3CreateButtonDisabled
            ]}
            disabled={!formData.confirmed || isSubmitting}
            onPress={handleStep3Create}
          >
            <CheckCircle size={20} color={formData.confirmed ? "#ffffff" : "#9ca3af"} />
            <Text style={[
              styles.step3CreateButtonText,
              (!formData.confirmed || isSubmitting) && styles.step3CreateButtonTextDisabled
            ]}>
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showSummary) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowSummary(false)} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transaction Summary</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.summaryCard}>
            {/* Show only the other party (not the current user) */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {formData.role === 'Buyer' ? 'Seller:' : 'Buyer:'}
              </Text>
              <Text style={styles.summaryValue}>
                {otherPartyName ? maskName(otherPartyName) : maskUserId(formData.userId)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>{formData.amount} EGP</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fees Paid By:</Text>
              <Text style={styles.summaryValue}>{formData.feesResponsibility}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Date:</Text>
              <Text style={styles.summaryValue}>{formData.deliveryDate}</Text>
            </View>
            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Terms:</Text>
              {getTermsArray().map((term, index) => (
                <Text key={index} style={styles.summaryTerm}>• {term}</Text>
              ))}
            </View>
          </View>

          <View style={styles.confirmSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setFormData({ ...formData, confirmed: !formData.confirmed })}
            >
              <View style={[styles.checkbox, formData.confirmed && styles.checkboxChecked]}>
                {formData.confirmed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree that the above information is correct and these are the terms of the contract.
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, (!formData.confirmed || isSubmitting) && styles.confirmButtonDisabled]}
            disabled={!formData.confirmed || isSubmitting}
            onPress={handleConfirm}
          >
            <Text style={[styles.confirmButtonText, (!formData.confirmed || isSubmitting) && styles.confirmButtonTextDisabled]}>
              {isSubmitting ? 'Creating...' : 'Confirm Transaction'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Transaction</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.form}>
          {/* Transaction Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Transaction Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter transaction title"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Role Dropdown */}
          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.optionsContainer}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.optionButton,
                    formData.role === role && styles.optionButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, role })}
                >
                  <Text style={[
                    styles.optionText,
                    formData.role === role && styles.optionTextActive
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Username or Email Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Other Party (Username or Email)</Text>
            <TextInput
              style={styles.input}
              value={formData.userId}
              onChangeText={handleUserIdChange}
              placeholder="Enter username or email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {checkingUser && (
              <View style={styles.nameContainer}>
                <ActivityIndicator size="small" color="#64748b" />
                <Text style={styles.checkingText}>Checking user...</Text>
              </View>
            )}
            {!checkingUser && otherPartyName && (
              <Text style={styles.userName}>{maskName(otherPartyName)}</Text>
            )}
            {!checkingUser && formData.userId && !otherPartyName && (
              <Text style={styles.userNameError}>User not found</Text>
            )}
          </View>

          {/* Fees Responsibility */}
          <View style={styles.field}>
            <Text style={styles.label}>Fees Responsibility</Text>
            <View style={styles.optionsContainer}>
              {feesOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.radioButton,
                    formData.feesResponsibility === option && styles.radioButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, feesResponsibility: option })}
                >
                  <View style={[
                    styles.radioCircle,
                    formData.feesResponsibility === option && styles.radioCircleActive
                  ]}>
                    {formData.feesResponsibility === option && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.radioLabel,
                    formData.feesResponsibility === option && styles.radioLabelActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>EGP</Text>
              <TextInput
                style={styles.amountInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>
            {formData.amount && parseFloat(formData.amount) > 0 && (
              <View style={styles.feesRow}>
                <Text style={styles.feesLabel}>Fees:</Text>
                <Text style={styles.feesValue}>
                  {calculateTransactionFee(parseFloat(formData.amount)).toFixed(2)} EGP
                </Text>
              </View>
            )}
          </View>

          {/* Terms */}
          <View style={styles.field}>
            <Text style={styles.label}>Terms</Text>
            {formData.terms.map((term, index) => (
              <View key={index} style={styles.termRow}>
                <TextInput
                  style={[styles.input, styles.termInput]}
                  value={term}
                  onChangeText={(text) => handleTermChange(index, text)}
                  placeholder="Add a term"
                  placeholderTextColor="#94a3b8"
                />
                {formData.terms.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteTermButton}
                    onPress={() => handleRemoveTerm(index)}
                  >
                    <Trash2 size={18} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {formData.terms.length === 0 && (
              <View style={styles.termRow}>
                <TextInput
                  style={[styles.input, styles.termInput]}
                  value=""
                  onChangeText={(text) => {
                    if (formData.terms.length === 0) {
                      setFormData({ ...formData, terms: [text] });
                    } else {
                      handleTermChange(0, text);
                    }
                  }}
                  placeholder="Add a term"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.addTermButton}
              onPress={handleAddTerm}
            >
              <Text style={styles.addTermIcon}>+</Text>
              <Text style={styles.addTermText}>Add Another Term</Text>
            </TouchableOpacity>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.optionsContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.optionButton,
                    formData.category === category && styles.optionButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, category })}
                >
                  <Text style={[
                    styles.optionText,
                    formData.category === category && styles.optionTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Delivery Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Delivery Date (Optional)</Text>
            <TextInput
              ref={deliveryDateInputRef}
              style={styles.input}
              value={formData.deliveryDate}
              onChangeText={(text) => {
                // Remove all non-numeric characters
                const numbers = text.replace(/\D/g, '');
                
                // Format as DD-MM-YYYY with auto dashes
                let formatted = numbers;
                if (numbers.length > 2) {
                  formatted = numbers.substring(0, 2) + '-' + numbers.substring(2);
                }
                if (numbers.length > 4) {
                  formatted = numbers.substring(0, 2) + '-' + numbers.substring(2, 4) + '-' + numbers.substring(4, 8);
                }
                
                setFormData({ ...formData, deliveryDate: formatted });
              }}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              maxLength={10}
              onFocus={() => {
                // Scroll to input when focused - scroll to end to ensure delivery date is visible
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !isFormValid() && styles.continueButtonDisabled]}
            disabled={!isFormValid()}
            onPress={handleContinue}
          >
            <Text style={[
              styles.continueButtonText,
              !isFormValid() && styles.continueButtonTextDisabled
            ]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  step1Container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  step1Header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  step1HeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
  },
  step1BackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step1HeaderText: {
    flex: 1,
  },
  step1Title: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
    marginBottom: 0,
  },
  step1Subtitle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
    marginTop: 0,
  },
  step1ProgressSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 16,
    paddingBottom: 1,
    paddingHorizontal: 24,
    height: 69,
  },
  step1ProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    height: 20,
  },
  step1ProgressText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#4a5565',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step1ProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  step1ProgressFill: {
    height: '100%',
    backgroundColor: '#155dfc',
    borderRadius: 9999,
  },
  step1ScrollView: {
    flex: 1,
  },
  step1ScrollContent: {
    paddingBottom: 24,
  },
  step1Content: {
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 24,
  },
  step1QuestionSection: {
    gap: 8,
  },
  step1Question: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 27,
    fontFamily: 'Arimo',
  },
  step1Description: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step1Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  step1TypeCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 26,
    minHeight: 172,
  },
  step1TypeCardSelected: {
    borderColor: '#155dfc',
  },
  step1TypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  step1TypeName: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
    marginBottom: 4,
  },
  step1TypeDescription: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step1InfoBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bedbff',
    borderRadius: 14,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 74,
  },
  step1InfoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#1c398e',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step2Container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  step2Header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  step2HeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
  },
  step2BackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step2HeaderText: {
    flex: 1,
  },
  step2Title: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
    marginBottom: 0,
  },
  step2Subtitle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
    marginTop: 0,
    textTransform: 'capitalize',
  },
  step2ProgressSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 16,
    paddingBottom: 1,
    paddingHorizontal: 24,
    height: 69,
  },
  step2ProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    height: 20,
  },
  step2ProgressText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#4a5565',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step2ProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  step2ProgressFill: {
    height: '100%',
    backgroundColor: '#155dfc',
    borderRadius: 9999,
  },
  step2ScrollView: {
    flex: 1,
  },
  step2ScrollContent: {
    paddingBottom: 200,
  },
  step2Content: {
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 20,
  },
  step2Card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 21,
    gap: 12,
  },
  step2CardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  step2CardLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step2RoleButtons: {
    flexDirection: 'row',
    gap: 12,
    height: 80,
  },
  step2RoleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 18,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step2RoleButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#155dfc',
  },
  step2RoleButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
    textAlign: 'center',
  },
  step2RoleButtonTextSelected: {
    color: '#101828',
  },
  step2RoleButtonSubtext: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 16,
    fontFamily: 'Arimo',
    textAlign: 'center',
  },
  step2RoleButtonSubtextSelected: {
    color: '#6a7282',
  },
  step2Input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5dc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Arimo',
    color: '#101828',
  },
  step2HelperText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step2CheckingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  step2CheckingText: {
    fontSize: 14,
    color: '#6a7282',
    fontFamily: 'Arimo',
  },
  step2SuccessBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#b9f8cf',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    minHeight: 70,
  },
  step2SuccessTextContainer: {
    flex: 1,
  },
  step2SuccessTitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#0d542b',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step2SuccessName: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#008236',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step2ErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 13,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 70,
  },
  step2ErrorTextContainer: {
    flex: 1,
  },
  step2ErrorTitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#dc2626',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  step2ErrorSubtext: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#991b1b',
    fontFamily: 'Arimo',
    lineHeight: 20,
    marginTop: 2,
  },
  step2ErrorText: {
    fontSize: 14,
    color: '#ef4444',
    fontFamily: 'Arimo',
    marginTop: 8,
  },
  step2AmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5dc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  step2CurrencySymbol: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 24,
    fontFamily: 'Arimo',
    marginRight: 8,
  },
  step2AmountInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Arimo',
    color: '#101828',
  },
  step2AmountBreakdown: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 12,
  },
  step2BreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 20,
  },
  step2BreakdownRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 9,
    marginTop: 4,
    height: 33,
  },
  step2BreakdownLabel: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#4a5565',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step2BreakdownLabelTotal: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
  },
  step2BreakdownValue: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step2BreakdownValueTotal: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
  },
  step2Footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 25,
    paddingHorizontal: 24,
  },
  step2ContinueButton: {
    height: 56,
    backgroundColor: '#155dfc',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step2ContinueButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  step2ContinueButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3Container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  step3Header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  step3HeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
  },
  step3BackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3HeaderText: {
    flex: 1,
  },
  step3Title: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
    marginBottom: 0,
  },
  step3Subtitle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
    marginTop: 0,
  },
  step3ProgressSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 16,
    paddingBottom: 1,
    paddingHorizontal: 24,
    height: 69,
  },
  step3ProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    height: 20,
  },
  step3ProgressText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#4a5565',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step3ProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  step3ProgressFill: {
    height: '100%',
    backgroundColor: '#155dfc',
    borderRadius: 9999,
  },
  step3ScrollView: {
    flex: 1,
  },
  step3ScrollContent: {
    paddingBottom: 24,
  },
  step3Content: {
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 20,
  },
  step3Card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 21,
    gap: 12,
  },
  step3CardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  step3CardLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3Input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5dc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Arimo',
    color: '#101828',
  },
  step3TermsList: {
    gap: 12,
  },
  step3TermRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  step3TermInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5dc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Arimo',
    color: '#101828',
  },
  step3DeleteTermButton: {
    width: 48,
    height: 48,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3AddTermButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    height: 24,
  },
  step3AddTermText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#155dfc',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3FeeOptions: {
    gap: 8,
  },
  step3FeeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 17,
    paddingVertical: 1,
  },
  step3FeeOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2b7fff',
  },
  step3FeeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  step3RadioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3RadioButtonSelected: {
    borderColor: '#155dfc',
  },
  step3RadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#155dfc',
  },
  step3FeeOptionText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3FeeOptionTextSelected: {
    color: '#101828',
  },
  step3FeeAmount: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step3SummaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bedbff',
    borderRadius: 16,
    padding: 21,
    gap: 16,
  },
  step3SummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  step3SummaryTitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3SummaryContent: {
    gap: 10,
  },
  step3SummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
  },
  step3SummaryLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#4a5565',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3SummaryValue: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
    textTransform: 'capitalize',
  },
  step3AgreementCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bedbff',
    borderRadius: 16,
    padding: 21,
  },
  step3CheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  step3Checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  step3CheckboxChecked: {
    backgroundColor: '#155dfc',
    borderColor: '#155dfc',
  },
  step3CheckboxTextContainer: {
    flex: 1,
    gap: 4,
  },
  step3CheckboxTitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3CheckboxSubtext: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6a7282',
    lineHeight: 20,
    fontFamily: 'Arimo',
  },
  step3Checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  step3Footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 25,
    paddingHorizontal: 24,
  },
  step3CreateButton: {
    height: 56,
    backgroundColor: '#155dfc',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  step3CreateButtonDisabled: {
    backgroundColor: '#d1d5dc',
  },
  step3CreateButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    lineHeight: 24,
    fontFamily: 'Arimo',
  },
  step3CreateButtonTextDisabled: {
    color: '#ffffff',
  },
});

