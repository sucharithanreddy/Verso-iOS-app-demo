import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// Helper to get today's date string (YYYY-MM-DD)
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Helper to get date string from Date object
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// POST - Record user activity (called when user opens/uses the app)
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user
    let user = await db.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      // Create user if doesn't exist
      let email = `${userId}@placeholder.com`;
      let name = 'User';
      let avatarUrl = null;

      if (process.env.CLERK_SECRET_KEY) {
        try {
          const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          });
          const userData = await userResponse.json();
          email = userData.email_addresses?.[0]?.email_address || email;
          name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || name;
          avatarUrl = userData.image_url;
        } catch (e) {
          console.error('Could not fetch user data from Clerk:', e);
        }
      }

      user = await db.user.create({
        data: { clerkId: userId, email, name, avatarUrl },
      });
    }

    // Get today's date string
    const today = getTodayString();

    // Get existing activity dates
    const existingDates: string[] = (user.activityDates as string[]) || [];

    // Check if today is already recorded
    if (existingDates.includes(today)) {
      return NextResponse.json({ success: true, alreadyRecorded: true, streak: calculateStreak(existingDates) });
    }

    // Add today to activity dates (keep last 365 days only)
    const updatedDates = [...existingDates, today].filter((date) => {
      const d = new Date(date);
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return d >= yearAgo;
    });

    // Update user with new activity dates
    await db.user.update({
      where: { id: user.id },
      data: { activityDates: updatedDates },
    });

    return NextResponse.json({ 
      success: true, 
      alreadyRecorded: false, 
      streak: calculateStreak(updatedDates) 
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}

// GET - Get user's activity streak
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ streak: 0, totalDays: 0, activityDates: [] });
    }

    const activityDates: string[] = (user.activityDates as string[]) || [];
    const streak = calculateStreak(activityDates);

    return NextResponse.json({
      streak,
      totalDays: activityDates.length,
      activityDates: activityDates.slice(-30), // Last 30 days
      lastActive: activityDates.length > 0 ? activityDates[activityDates.length - 1] : null,
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

// Calculate consecutive day streak
function calculateStreak(dates: string[]): number {
  if (!dates || dates.length === 0) return 0;

  const sortedDates = [...dates].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const checkDateStr = getDateString(checkDate);

    if (sortedDates.includes(checkDateStr)) {
      streak++;
    } else if (i > 0) {
      // Break streak if missing a day (not today - user might not have opened app yet today)
      break;
    }
  }

  return streak;
}
