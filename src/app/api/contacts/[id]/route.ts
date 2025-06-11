import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import connectDB from '@/lib/mongodb';
import { Contact } from '@/models/contact';
import { createContactEventService } from '@/lib/contact-event-service';
import type { UniversalContact } from '@/types/contact';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const params = await context.params;
    const contactId = params.id;

    await connectDB();

    const updatedContact = await Contact.findOneAndUpdate(
      { id: contactId, customerId: auth.customerId },
      {
        ...body,
        updatedTime: new Date().toISOString(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Send contact updated event to Integration.app
    try {
      const eventService = createContactEventService(auth);
      await eventService.sendContactUpdatedEvent(updatedContact as UniversalContact, body);
    } catch (eventError) {
      console.error('Failed to send contact updated event:', eventError);
      // Continue with response even if event fails
    }

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const contactId = params.id;

    await connectDB();

    const deletedContact = await Contact.findOneAndDelete({
      id: contactId,
      customerId: auth.customerId,
    });

    if (!deletedContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Send contact deleted event to Integration.app
    try {
      const eventService = createContactEventService(auth);
      await eventService.sendContactDeletedEvent(deletedContact as UniversalContact);
    } catch (eventError) {
      console.error('Failed to send contact deleted event:', eventError);
      // Continue with response even if event fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const contactId = params.id;

    await connectDB();

    const contact = await Contact.findOne({
      id: contactId,
      customerId: auth.customerId,
    }).lean();

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contact as unknown as UniversalContact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 