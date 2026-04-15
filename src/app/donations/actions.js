'use server'
import { prisma } from '@/lib/prisma'
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/r2";

export async function uploadReceipt(formData) {
  try {
    const file = formData.get('file');
    if (!file) throw new Error("No file provided");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop();
    const fileName = `receipts/${Date.now()}.${fileExt}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('uploadReceipt Error:', error);
    return { success: false, error: error.message };
  }
}

export async function addDonation(donationData) {
  try {
    const data = await prisma.donations.create({
      data: {
        ...donationData,
        amount: donationData.amount ? parseFloat(donationData.amount) : 0,
        date: donationData.date ? new Date(donationData.date) : null
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('addDonation Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateDonation(id, donationData) {
  try {
    const data = await prisma.donations.update({
      where: { id },
      data: {
        ...donationData,
        amount: donationData.amount ? parseFloat(donationData.amount) : undefined,
        date: donationData.date ? new Date(donationData.date) : undefined
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('updateDonation Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteDonation(id) {
  try {
    await prisma.donations.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error('deleteDonation Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getDonations() {
  try {
    const data = await prisma.donations.findMany({
      include: {
        donors: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getDonations Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getDonors() {
  try {
    const data = await prisma.donors.findMany({
      select: { id: true, name: true }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getDonors Error:', error)
    return { success: false, error: error.message }
  }
}
