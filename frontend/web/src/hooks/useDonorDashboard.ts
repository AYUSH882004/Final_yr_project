import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { Drive, Milestone } from './useDrives';
import { BlockchainService } from '../utils/BlockchainService';

interface Donation {
  id: string;
  drive_id: string;
  amount: number;
  donor_name: string;
  created_at: string;
}

export const useDonorDashboard = () => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDrives = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('drives')
      .select('*, milestones(*)')
      .order('created_at', { ascending: false });

    if (fetchError) { setError(fetchError.message); return; }
    setDrives((data as Drive[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDrives();

    // Real-time listener: refresh whenever drives or milestones change
    const channel = supabase
      .channel('donor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drives' }, () => fetchDrives())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => fetchDrives())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDrives]);

  const donate = async (driveId: string, amount: number, donorName: string) => {
    setDonating(driveId);
    try {
      const drive = drives.find(d => d.id === driveId);
      if (!drive) throw new Error('Drive not found');

      let txHash = null;
      // Blockchain integration
      if (drive.blockchain_id) {
        try {
          console.log("Processing on-chain donation...");
          // For demo, we use a small amount of ETH if the amount is in INR
          // Or just pass the amount as string if it's already in ETH
          const ethAmount = (amount / 100000).toString(); // Rough conversion for demo
          const receipt = await BlockchainService.donate(drive.blockchain_id, ethAmount);
          txHash = receipt.hash;
          console.log("On-chain donation successful, TX:", txHash);
        } catch (bcErr) {
          console.error("Blockchain donation failed:", bcErr);
          // Optional: throw error or continue with just DB update
        }
      }

      // Increment raised_amount on the drive
      const newAmount = (drive.raised_amount || 0) + amount;

      const { error: updateError } = await supabase
        .from('drives')
        .update({ 
          raised_amount: newAmount,
          // Store txHash in a metadata field or new column if we had it
        })
        .eq('id', driveId);

      if (updateError) throw updateError;

      // Log donation in donations table
      await supabase.from('donations').insert({
        drive_id: driveId,
        amount: amount,
        donor_id: '00000000-0000-0000-0000-000000000000', // Demo donor
        transaction_id: txHash || `OFFLINE-${Date.now()}`,
        status: 'completed'
      });

      // Optimistic update immediately so UI feels instant
      setDrives(prev =>
        prev.map(d => d.id === driveId ? { ...d, raised_amount: newAmount } : d)
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDonating(null);
    }
  };

  return { drives, loading, error, donate, donating };
};
