# FitFaat Use Case Diagram

This document contains the fixed use case diagram updated to accurately reflect FitFaat's codebase logic.

## Summary of Fixes:
1. **Added Clarifai API Actor:** Incorporated `Clarifai API` for the `Log Meals` use case, as image food detection relies on this service instead of HeaLora.
2. **Removed Duplicate Nodes:** The original diagram incorrectly showed duplicate use cases (like `Manage Appointments`, `Track Weekly/Daily Progress`, `Appointment Chat`). These have been unified to standard UML.
3. **Corrected Doctor Progress Tracking:** Removed the incorrect link between `Doctor` and `Track Weekly/Daily Progress` since progress tracking applies to the User.
4. **Refined Video Consultation and Chat Links:** Both User and Doctor can connect to `Appointment Chat` and `Join Video Consultations` (powered by `ZegoCloud`).
5. **Consolidated Extends/Includes:** Fixed the `<<include>>` arrows pointing from `Register Account` -> `Authenticate` -> `Verify OTP`.

---

## Mermaid Diagram

```mermaid
flowchart LR
    %% Styling
    classDef actorStyle fill:#dcefff,stroke:#3b82f6,stroke-width:2px,color:#000
    classDef useCaseStyle fill:#ffffff,stroke:#94a3b8,stroke-width:2px,color:#0f172a,border-radius:20px
    classDef extActorStyle fill:#fef08a,stroke:#eab308,stroke-width:2px,color:#000
    classDef notifStyle fill:#fbcfe8,stroke:#ec4899,stroke-width:2px,color:#000

    %% Actors
    User((User)):::actorStyle
    Doctor((Doctor)):::actorStyle
    
    HeaLora[[HeaLora AI]]:::extActorStyle
    Clarifai[[Clarifai API]]:::extActorStyle
    ZegoCloud[[ZegoCloud]]:::extActorStyle
    Stripe[[Stripe API]]:::extActorStyle
    Backend[[Backend REST API]]:::extActorStyle
    ExpoNotif[[Expo Notifications]]:::notifStyle

    %% System Boundary
    subgraph FitFaat System
        direction TB
        %% Auth & Profile
        UC_Reg([Register Account]):::useCaseStyle
        UC_Auth([Authenticate]):::useCaseStyle
        UC_Verify([Verify OTP]):::useCaseStyle
        UC_Prof([Setup Profile]):::useCaseStyle
        UC_Diet([Setup Diet Plan]):::useCaseStyle
        
        %% Core User Features
        UC_LogMeals([Log Meals]):::useCaseStyle
        UC_TrackProg([Track Weekly/Daily Progress]):::useCaseStyle
        UC_News([Browse Health News]):::useCaseStyle
        UC_Workouts([Browse Workouts]):::useCaseStyle
        UC_HeaLora([Use HeaLora Chatbot]):::useCaseStyle
        
        %% Appointment & Communication
        UC_BookAppt([Book Doctor Appointment]):::useCaseStyle
        UC_ManageAppt([Manage Appointments]):::useCaseStyle
        UC_ApptChat([Appointment Chat]):::useCaseStyle
        UC_VideoCall([Join Video Consultations]):::useCaseStyle
        
        %% Payment
        UC_PaymentMeth([Manage Payment Methods]):::useCaseStyle
        UC_PaymentSub([Manage Payment Subscriptions]):::useCaseStyle

        %% Doctor Specific
        UC_RegDoc([Register As Doctor]):::useCaseStyle
        UC_DocStatus([Manage Application Status]):::useCaseStyle
        UC_ManageCons([Manage Consultations]):::useCaseStyle
        UC_ManagePat([Manage Patients]):::useCaseStyle
        
        %% Notifications
        UC_NotifAppt([Receive Appointment Alert]):::useCaseStyle
        UC_NotifPay([Receive Payment Reminder]):::useCaseStyle
        UC_NotifHealth([Receive Health Alerts]):::useCaseStyle
        UC_NotifRemind([Receive Fitness Reminder]):::useCaseStyle
    end

    %% Includes & Extends
    UC_Reg -.->|<<include>>| UC_Auth
    UC_Auth -.->|<<include>>| UC_Verify
    UC_BookAppt -.->|<<extend>>| UC_ManageAppt
    UC_VideoCall -.->|<<extend>>| UC_ManageAppt

    %% User Interactions
    User --> UC_Reg
    User --> UC_Auth
    User --> UC_Prof
    User --> UC_Diet
    User --> UC_LogMeals
    User --> UC_TrackProg
    User --> UC_News
    User --> UC_Workouts
    User --> UC_HeaLora
    User --> UC_BookAppt
    User --> UC_ManageAppt
    User --> UC_ApptChat
    User --> UC_VideoCall
    User --> UC_PaymentMeth
    User --> UC_PaymentSub

    %% Doctor Interactions
    Doctor --> UC_Auth
    Doctor --> UC_RegDoc
    Doctor --> UC_DocStatus
    Doctor --> UC_ManageCons
    Doctor --> UC_ManagePat
    Doctor --> UC_ApptChat
    Doctor --> UC_VideoCall
    Doctor --> UC_HeaLora

    %% External API Interactions
    UC_HeaLora --- HeaLora
    UC_LogMeals --- Clarifai
    UC_VideoCall --- ZegoCloud
    UC_PaymentMeth --- Stripe
    UC_PaymentSub --- Stripe

    %% Backend Interactions
    UC_TrackProg --- Backend
    UC_ApptChat --- Backend
    UC_BookAppt --- Backend
    UC_ManageAppt --- Backend
    UC_RegDoc --- Backend

    %% Notification Interactions
    ExpoNotif --- UC_NotifAppt
    ExpoNotif --- UC_NotifPay
    ExpoNotif --- UC_NotifHealth
    ExpoNotif --- UC_NotifRemind
```

---

## PlantUML Source
If you prefer traditional UML visualization, here is the `.puml` code:

```plantuml
@startuml FitFaat_UseCase_Diagram
left to right direction
skinparam packageStyle rectangle
skinparam usecase {
    BackgroundColor White
    BorderColor DarkSlateGray
    ArrowColor DimGray
}

actor User
actor Doctor
actor "HeaLora AI" as HeaLora <<System>>
actor "Clarifai API" as Clarifai <<System>>
actor "ZegoCloud" as ZegoCloud <<System>>
actor "Stripe" as Stripe <<System>>
actor "Backend REST API" as Backend <<System>>
actor "Expo Notifications" as ExpoNotif <<System>>

rectangle "FitFaat Application" {
  usecase "Register Account" as UC_Reg
  usecase "Authenticate" as UC_Auth
  usecase "Verify OTP" as UC_VerifyOTP
  usecase "Setup Profile" as UC_SetupProfile
  usecase "Setup Diet Plan" as UC_SetupDiet
  usecase "Log Meals" as UC_LogMeals
  usecase "Track Weekly/Daily Progress" as UC_TrackProgress
  usecase "Browse Health News" as UC_BrowseNews
  usecase "Browse Workouts" as UC_BrowseWorkouts
  usecase "Use HeaLora" as UC_UseHeaLora
  usecase "Book Doctor Appointment" as UC_BookAppt
  usecase "Manage Appointments" as UC_ManageAppt
  usecase "Appointment Chat" as UC_ApptChat
  usecase "Manage Payment Methods" as UC_ManagePayment
  usecase "Manage Payment Subscriptions" as UC_ManageSubscription
  usecase "Join Video Consultations" as UC_JoinVideo

  usecase "Register As Doctor" as UC_RegDoctor
  usecase "Manage Application Status" as UC_ManageAppStatus
  usecase "Manage Consultations" as UC_ManageConsultations
  usecase "Accept Appointment" as UC_AcceptAppt
  usecase "Manage Patients" as UC_ManagePatients

  usecase "Receive Appointment Alert" as UC_RecvAppt
  usecase "Receive Payment Reminder" as UC_RecvPaymentRem
  usecase "Receive Health Alerts" as UC_RecvHealthAlert
  usecase "Receive Health/Fitness Reminder" as UC_RecvFitnessRem
}

' User connections
User --> UC_Reg
User --> UC_Auth
User --> UC_SetupProfile
User --> UC_SetupDiet
User --> UC_LogMeals
User --> UC_TrackProgress
User --> UC_BrowseNews
User --> UC_BrowseWorkouts
User --> UC_UseHeaLora
User --> UC_BookAppt
User --> UC_ManageAppt
User --> UC_ManagePayment
User --> UC_ManageSubscription
User --> UC_JoinVideo
User --> UC_ApptChat

' Doctor connections
Doctor --> UC_RegDoctor
Doctor --> UC_ManageAppStatus
Doctor --> UC_ManageConsultations
Doctor --> UC_AcceptAppt
Doctor --> UC_ManagePatients
Doctor --> UC_UseHeaLora
Doctor --> UC_JoinVideo
Doctor --> UC_Auth
Doctor --> UC_ApptChat

' Includes / Extends
UC_Auth ..> UC_VerifyOTP : <<include>>
UC_Reg ..> UC_Auth : <<include>>
UC_BookAppt ..> UC_ManageAppt : <<extend>>
UC_AcceptAppt ..> UC_ManageConsultations : <<extend>>
UC_JoinVideo ..> UC_ManageAppt : <<extend>>

' External Systems connections
UC_UseHeaLora <-- HeaLora
UC_LogMeals <-- Clarifai
UC_JoinVideo <-- ZegoCloud
UC_ManagePayment <-- Stripe
UC_ManageSubscription <-- Stripe

' Backend Connections
UC_TrackProgress --> Backend
UC_ApptChat --> Backend
UC_BookAppt --> Backend
UC_ManageAppt --> Backend
UC_RegDoctor --> Backend
UC_Reg --> Backend

' Notifications Connections
ExpoNotif --> UC_RecvAppt
ExpoNotif --> UC_RecvPaymentRem
ExpoNotif --> UC_RecvHealthAlert
ExpoNotif --> UC_RecvFitnessRem

@enduml
```
