import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { state } = useContext(AuthContext);

  // Sample transaction data - in real app, fetch by ID
  const transaction = {
    id: id || 'TXN001',
    title: 'Website Development',
    startDate: 'Nov 15, 2025',
    deliveryDate: 'Dec 15, 2025',
    buyer: 'John Doe',
    seller: 'Sarah Johnson',
    buyerId: 'USER123',
    sellerId: 'USER456',
    amount: 2500,
    status: 'In Progress',
    role: 'Buyer',
    category: 'Service',
    feesResponsibility: 'Buyer',
    terms: [
      'Complete website design and development',
      'Responsive design for all devices',
      'SEO optimization included',
      '3 months of free maintenance',
    ],
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'In Progress':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'In Dispute':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Buyer':
        return { bg: '#ede9fe', text: '#6d28d9' };
      case 'Seller':
        return { bg: '#fef3c7', text: '#d97706' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const maskUserId = (userId) => {
    if (!userId) return '';
    if (userId.length <= 4) return userId;
    return '****' + userId.slice(-4);
  };

  const handleDispute = () => {
    Alert.alert(
      'Open Dispute',
      'Are you sure you want to open a dispute for this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Dispute',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Dispute opened successfully');
          },
        },
      ]
    );
  };

  const handleConfirmDelivery = () => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you want to confirm delivery? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Delivery confirmed successfully');
          },
        },
      ]
    );
  };

  const statusColors = getStatusColor(transaction.status);
  const roleColors = getRoleColor(transaction.role);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Status and Role Tags */}
        <View style={styles.tagsContainer}>
          <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusTagText, { color: statusColors.text }]}>
              {transaction.status}
            </Text>
          </View>
          <View style={[styles.roleTag, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleTagText, { color: roleColors.text }]}>
              {transaction.role}
            </Text>
          </View>
        </View>

        {/* Transaction Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.transactionTitle}>{transaction.title}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transaction ID:</Text>
            <Text style={styles.infoValue}>{transaction.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date:</Text>
            <Text style={styles.infoValue}>{transaction.startDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Date:</Text>
            <Text style={styles.infoValue}>{transaction.deliveryDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{transaction.category}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Buyer:</Text>
            <Text style={styles.infoValue}>
              {transaction.role === 'Buyer' ? 'You' : maskUserId(transaction.buyerId)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Seller:</Text>
            <Text style={styles.infoValue}>
              {transaction.role === 'Seller' ? 'You' : maskUserId(transaction.sellerId)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount:</Text>
            <Text style={styles.amountValue}>${transaction.amount.toFixed(2)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fees Paid By:</Text>
            <Text style={styles.infoValue}>{transaction.feesResponsibility}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.termsSection}>
            <Text style={styles.infoLabel}>Terms:</Text>
            {transaction.terms.map((term, index) => (
              <Text key={index} style={styles.termItem}>• {term}</Text>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {transaction.status !== 'Completed' && transaction.status !== 'In Dispute' && (
            <>
              <TouchableOpacity
                style={styles.disputeButton}
                onPress={handleDispute}
              >
                <Text style={styles.disputeButtonText}>Dispute</Text>
              </TouchableOpacity>

              {transaction.role === 'Buyer' && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmDelivery}
                >
                  <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
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
  tagsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statusTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transactionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  termsSection: {
    marginTop: 8,
  },
  termItem: {
    fontSize: 14,
    color: '#0f172a',
    marginTop: 8,
    marginLeft: 8,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  disputeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  disputeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

