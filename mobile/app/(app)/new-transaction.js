import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import * as DatabaseService from '../../src/services/databaseService';
import { calculateTransactionFee, getFeePercentageDisplay } from '../../src/constants/fees';

export default function NewTransactionScreen() {
  const router = useRouter();
  const { state } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef(null);
  const deliveryDateInputRef = useRef(null);
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

  const [showSummary, setShowSummary] = useState(false);
  const [otherPartyName, setOtherPartyName] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);

  const roles = ['Buyer', 'Seller'];
  const categories = ['Product', 'Service', 'Digital', 'Other'];
  const feesOptions = ['Buyer', 'Seller', 'Split Fees'];

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
  };

  // Debounced user lookup to fetch full name
  useEffect(() => {
    if (!formData.userId || !formData.userId.trim()) {
      setOtherPartyName('');
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
        } else {
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
      } finally {
        setCheckingUser(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.userId]);

  useFocusEffect(
    React.useCallback(() => {
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
      setShowSummary(false);
      setOtherPartyName('');
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
    setFormData({ ...formData, terms: [...formData.terms, ''] });
  };

  const handleRemoveTerm = (index) => {
    // Only allow removal if there's more than one term
    if (formData.terms.length > 1) {
      const newTerms = formData.terms.filter((_, i) => i !== index);
      setFormData({ ...formData, terms: newTerms });
    }
  };

  const getTermsArray = () => {
    if (!formData.terms || formData.terms.length === 0) return [];
    return formData.terms.filter(term => term.trim() !== '');
  };

  const isFormValid = () => {
    // Check if all required fields are filled
    const hasRequiredFields = (
      formData.title &&
      formData.role &&
      formData.userId &&
      formData.amount &&
      formData.terms.length > 0 &&
      formData.terms.some(term => term.trim() !== '') &&
      formData.category &&
      formData.feesResponsibility
    );
    
    // If userId is provided, check if user was found
    if (formData.userId && formData.userId.trim()) {
      // If still checking, don't allow proceed
      if (checkingUser) {
        return false;
      }
      // If user ID provided but name not found, don't allow proceed
      if (!otherPartyName) {
        return false;
      }
    }
    
    return hasRequiredFields;
  };

  const handleContinue = () => {
    if (!isFormValid()) {
      // Check if the issue is with user not found
      if (formData.userId && formData.userId.trim() && !checkingUser && !otherPartyName) {
        Alert.alert('Error', 'User not found. Please check the username or email and try again.');
        return;
      }
      // Check if still checking user
      if (checkingUser) {
        Alert.alert('Please wait', 'Checking user...');
        return;
      }
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setShowSummary(true);
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
      setShowSummary(false);
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
                    <Text style={styles.deleteTermIcon}>🗑️</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#0f172a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  placeholder: {
    width: 40,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  termInput: {
    flex: 1,
    marginBottom: 0,
  },
  deleteTermButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteTermIcon: {
    fontSize: 18,
  },
  addTermButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  addTermIcon: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  addTermText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  feesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  feesLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  feesValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  maskedName: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  checkingText: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    marginTop: 8,
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  userNameError: {
    marginTop: 8,
    fontSize: 14,
    color: '#ef4444',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  optionTextActive: {
    color: '#ffffff',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButtonActive: {
    // Additional styling if needed
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#3b82f6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  radioLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  continueButtonTextDisabled: {
    color: '#94a3b8',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  summarySection: {
    marginTop: 8,
  },
  summaryTerm: {
    fontSize: 14,
    color: '#0f172a',
    marginTop: 8,
    marginLeft: 8,
  },
  confirmSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  confirmButton: {
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  confirmButtonTextDisabled: {
    color: '#94a3b8',
  },
});

