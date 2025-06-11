import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import connectDB from '@/lib/mongodb';
import { Contact } from '@/models/contact';
import { createContactEventService } from '@/lib/contact-event-service';
import type { ContactsResponse, UniversalContact } from '@/types/contact';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const contacts = await Contact.find({ customerId: auth.customerId }).lean();
    
    const response: ContactsResponse = {
      contacts: contacts as unknown as UniversalContact[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    await connectDB();

    // Create new contact with universal schema
    const contactData: Partial<UniversalContact> = {
      ...body,
      id: body.id || `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: auth.customerId,
      createdTime: new Date().toISOString(),
      updatedTime: new Date().toISOString(),
    };

    const contact = await Contact.create(contactData);

    // Send contact created event to Integration.app
    try {
      const eventService = createContactEventService(auth);
      await eventService.sendContactCreatedEvent(contact as UniversalContact);
    } catch (eventError) {
      console.error('Failed to send contact created event:', eventError);
      // Continue with response even if event fails
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedContact = await Contact.findOneAndUpdate(
      { id, customerId: auth.customerId },
      {
        ...updateData,
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
      await eventService.sendContactUpdatedEvent(updatedContact as UniversalContact, updateData);
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

export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const deletedContact = await Contact.findOneAndDelete({
      id,
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