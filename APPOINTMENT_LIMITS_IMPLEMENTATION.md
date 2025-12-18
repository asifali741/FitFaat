# Appointment Limits Implementation

## Overview
Implemented appointment booking limits for free vs premium users:
- **Free Users**: Maximum 1 active appointment
- **Premium Users**: Unlimited appointments

## Implementation Details

### 1. Backend Database Model (`/backend/src/models/User.js`)

Added appointment usage tracking to User schema:
```javascript
appointmentUsage: {
  totalAppointments: { type: Number, default: 0 },
  activeAppointments: { type: Number, default: 0 },
  lastBookedDate: { type: Date, default: null }
}
```

### 2. Backend API Endpoints

#### Check Appointment Limit
- **Route**: `GET /api/appointments/check-limit`
- **Access**: Private (requires authentication)
- **Response**:
  ```javascript
  {
    success: true,
    canBook: boolean,
    isPremium: boolean,
    activeAppointments: number,
    remainingAppointments: number (for free users only),
    appointmentLimit: number | "unlimited"
  }
  ```

#### Increment Appointment Count
- **Route**: `POST /api/appointments/increment-count`
- **Access**: Private (requires authentication)
- **Response**:
  ```javascript
  {
    success: true,
    appointmentUsage: { totalAppointments, activeAppointments, lastBookedDate }
  }
  ```

### 3. Appointment Booking Enforcement

Modified `bookAppointment()` controller to:
1. Check user premium status
2. For free users: Count active appointments (pending + confirmed status)
3. If free user has 1+ active appointments: Return 429 status with error
   ```javascript
   {
     success: false,
     message: 'Free users can only have 1 active appointment. Upgrade to premium for unlimited appointments.',
     appointmentLimitReached: true,
     activeAppointments: number,
     limit: 1
   }
   ```
4. Update appointment usage tracking when appointment is created
5. Premium users (with active subscription) bypass all checks

### 4. Frontend Limit Checking

**File**: `/app/(main)/(conference)/appointment-summary.tsx`

#### Limit Check Function
```typescript
const checkAppointmentLimit = async () => {
  // Fetches from GET /api/appointments/check-limit
  // Updates appointmentLimit state with canBook, isPremium, etc.
}
```

#### Booking Flow
1. Component mounts → Check limit
2. User clicks "Confirm Appointment"
3. If limit reached → Show modal instead of attempting booking
4. If not reached → Proceed with booking
5. Handle 429 errors from backend → Show modal

### 5. Frontend Appointment Limit Modal

Beautiful, professional modal similar to chat limit modal:

**Features Displayed**:
- Red alert icon
- Title: "Appointment Limit Reached"
- Subtitle: "You've reached your appointment limit"
- Description: Explains free vs premium
- Feature list with checkmarks:
  - ✓ Unlimited appointments
  - ✓ Priority doctor access
  - ✓ Unlimited chat support
- Price tag: $10/month (highlighted in green)
- "Upgrade to Premium" button (green, navigates to premium screen)
- "Maybe Later" button (gray, closes modal)
- Close button (X, top-right)

**Modal Styling**:
- White rounded container with shadow
- Semi-transparent dark overlay
- Responsive sizing using hp/wp percentages
- Professional color scheme matching app theme

### 6. Files Modified

1. **`/backend/src/models/User.js`**
   - Added appointmentUsage schema

2. **`/backend/src/controllers/appointmentController.js`**
   - Added checkAppointmentLimit() function
   - Added incrementAppointmentCount() function
   - Modified bookAppointment() to enforce limit and update tracking

3. **`/backend/src/routes/appointments.js`**
   - Added GET /check-limit route
   - Added POST /increment-count route
   - Updated imports to include new controller functions

4. **`/app/(main)/(conference)/appointment-summary.tsx`**
   - Added checkAppointmentLimit() function
   - Modified handleConfirmAppointment() to check limits
   - Added appointmentLimit state
   - Added showLimitModal state
   - Added appointment limit modal JSX (identical structure to chat limit modal)
   - Added 40+ lines of modal styling

### 7. Error Handling

**Backend (429 Status)**:
- Sent when free user attempts to book while already having 1 active appointment
- Includes `appointmentLimitReached: true` flag
- Contains current count and limit info

**Frontend**:
- Catches 429 errors
- Detects `appointmentLimitReached` flag in response
- Shows beautiful modal instead of plain alert
- Prevents invalid API calls with pre-flight check

### 8. Premium Status Verification

The limit check uses same premium verification as chat system:
```javascript
if (user.isPremium && user.premiumSubscription?.status === 'active') {
  // Unlimited appointments
} else {
  // Limited to 1 appointment
}
```

## Testing Checklist

✅ Backend Model Updated
✅ Limit Check Endpoint Created
✅ Increment Count Endpoint Created
✅ Appointment Booking Modified
✅ Frontend Limit Check Function
✅ Modal UI Implemented
✅ Error Handling Complete
✅ TypeScript Compilation Pass
✅ Premium User Bypass Working
✅ Free User Enforcement Working

## Usage Flow

### Free User Trying to Book 2nd Appointment:
1. Clicks "Confirm Appointment" on summary screen
2. `handleConfirmAppointment()` checks limit
3. `appointmentLimit.canBook === false` → Sets `showLimitModal = true`
4. Beautiful modal appears with premium features
5. User can click "Upgrade to Premium" → Navigates to premium screen
6. Or click "Maybe Later" → Dismisses modal

### Premium User:
1. Clicks "Confirm Appointment"
2. `appointmentLimit.canBook === true` (unlimited)
3. Booking proceeds normally
4. Appointment created successfully

### Limit Already Reached (Backend Fallback):
1. Even if frontend check fails, backend enforces
2. Returns 429 with appointmentLimitReached flag
3. Frontend catches error and shows modal
4. User never allowed to have 2+ active appointments

## Key Differences from Chat Limit

| Aspect | Chat Limit | Appointment Limit |
|--------|-----------|------------------|
| Free Limit | 5 messages/day | 1 active appointment |
| Reset Timing | Daily at midnight | None (per active status) |
| Check Endpoint | GET /chatbot/check-limit | GET /appointments/check-limit |
| Increment Endpoint | POST /chatbot/increment-count | POST /appointments/increment-count |
| Modal Title | "Free Usage Limit Reached" | "Appointment Limit Reached" |
| Primary Feature | Unlimited daily messages | Unlimited appointments |
| Location | Chat input (Controls component) | Appointment booking (Summary screen) |

## Integration with Existing Features

- ✅ Compatible with existing premium subscription system
- ✅ Uses same `isPremium` and `premiumSubscription` fields
- ✅ Uses same JWT authentication
- ✅ Uses same error handling pattern
- ✅ Modal follows same design pattern as chat limit modal
- ✅ No conflicts with payment or card management systems

## Future Enhancements (Optional)

1. Add monthly reset option (instead of just active status)
2. Add analytics for appointment limit hits
3. Add notification when approaching limit
4. Add bulk appointment management for admins
5. Add grace period for completing appointments
