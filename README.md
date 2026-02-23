# BOGCAT
> BOGCAT = Boots Opticians Gyle Coordinator's Assistive Tracker

## What is BOGCAT?
BOGCAT is a tracking application for the coordinator at Boots Opticians at the Gyle. The working hours are 9AM to 6PM. The coordinator is a collegue whose role is allocate tasks during this time. 

### Tasks
Tasks can be of the following types alongside the approximate time required to complete them:

1. Pre screening
    - Full Sight Test (15 mins)
    - Supplementary Test (10 mins)
2. Post checks (10 mins)
3. Dispensing 
    - Single Vision (30 mins)
    - Varifocals (30 mins)
4. Collection (10 mins)
5. E-GOS (30 mins)
6. File Pulling (1 hour)
7. Scanning (1 hour)

## Why BOGCAT?
The goal is to automate task allocation via a single real-time tracker, so that the coordinator can allocate tasks without manually running after other colleagues and asking for their availiblity or if they are free. The coordinator will be able to allocate tasks from their account.

The other goal is to enable communication between front desk and the coordinator, so that during busy hours, the front desk colleague can communicate (not literally) with the coordinator without having to leave the front desk.

## Types of Collegues at Boots Opticians at Gyle:
There are different types of collegues.
1. Optical Consultants
2. Managers & Assistant Managers
 
### Optical Consultants (OCs)
- Gaurang
- Aswin
- Matt Hobbs
- Matt McDougle
- Zimana
- Evie
- Rachel
- Oran
- Sophie
- Fiona
- Emama
- Giamba
- Aliza
- Emma-loise
- Promise
- Hans
- Kira
- Tamar

### Managers
- Iqbal
- Scott (assistant manager)
- Linda (assistant manager)
- Sylvia (assistant manager)

In addition, an additional admin account should be made that can be accessed by Iqbal (the main manager), and then me (the developer).

## App Architecture and tech stack:
The app should be a real time web application that should use web sockets for real time updates. A NextJS + Fastify stack seems like a good option. Authentication should be simple, with a single password to be used on all systems. That password is `Spring26*`. The password must be hashed, and be fed through an .env file, and password checking should authenticate with a matching hash.

### Database
We should use a simple relational database to store our data. sqlite3 is a the best option. The data is deterministic, with the number of OCs & managers not changing dynamically. This user base will remain fairly constant. We will add a new category of users in addition to OCs and managers in the future iterations. This category will be Optometrists (Optoms). 

Our database schema can be generated via prisma. The key entities (roles) here will be coordinator, and frontdesk, which are seperate elevated roles, and can be used by any colleague such as an OC or a manager. The colleagues will have their own logins in later versions.

### User interface
The app should have a modern, and easy to use interface. We will work on this project in multiple iterations/versions, adding features and colleagues as we progress.

## First iteration (v0.1)
We should have 2 roles:
- Front Desk
- Coordinator

Both users can only log in once, so if someone has logged into as frontdesk, no one else should be able to login with the frontdesk account, and the app should throw an error, saying only 1 login for these two accounts are allowed, so if coordinator is logged in, another login to the coordinator account should not be possible. The password for all 3 users must be `Spring26*`.

For v0.1, we should keep the layout simple.


### What the coordinator can see and do? (v0.1)
#### Task 1: Setting up for the day
The coordinator, should have access to the names of the colleagues who are in that day. This means, for every day, when the coordinator logs in, they must be able to set this up. They should be able to enter a new day, and then drag and drop the colleagues/managers who would be working that day. (See [OCs](#optical-consultants-ocs) & [managers](#managers)). The coordinator will know which colleagues are working that day in advance, so this section should just let them drag and drop or choose the colleagues that are in on that day. Not all colleagues will be working on a certain day. Some maybe off, or some may have called in sick, or might be on some leave (paternity for example), so it is important to have the names of all colleagues in the options. The coordinator can then choose the colleagues they now are working on this day.

They should only be allowed to do this before 10AM. After 10AM, the table should be locked and further changes must be prevented. This data should be saved for analysis later. The goal is to track other targets in later iterations.

#### Allocating Tasks:
This is the most important piece of this software. This is the part they will use to assign/delegate tasks to colleagues (OCs and Assistant Managers). Iqbal, the main manager should not be assigned tasks.

All colleagues will have a few statuses, which the coordinator will update via a drop down.
- Free (Colleague is free; use green color to show they are free)
- Busy (Colleague is busy; use red color to show they are busy).

If a colleague is free, the coordinator can allocate tasks to them. This can be anything from [tasks](#tasks). Once a task is allocated, that colleague will be shown as busy, alongside the task they have been assigned. This colleague cannot be allocated another task, until they finish their current task.

If a colleague is busy, the tracker should show the coordinator which task they are currently working on. The coordinator should also be able to reallocate tasks. So if a colleague needs more time to complete a longer tasks (scanning or file pulling for example), they can extend this. Some shorter tasks must be completed within a required amount of time.

### What the front desk role can see and do? (v0.1)
Any colleague can be assigned the frontdesk role. The role of the frontdesk entity is to update the coordinator, as they receive new patients. 

Patients can come into the store for the following reasons:
1. Sight Test - Arrive for their scheduled eye test
2. Collection - Arrive to collect their glasses
3. Adjustment - Arrive to fix or adjust their frames

The frontdesk entity should enter the Name (full name), Date of Birth of the patient. They should then press a button on this tracker to alert the coordinator (whose desk is far away), about a new arrival. The arrival message on the coordinator's account should show an alert and tell them whose has arrived, and why have they arrive. (See the reasons above). The coordinator can they allocate tasks as they should (See [Coordinator's Tasks](#what-the-coordinator-can-see-and-do-v01))


## Second Iteration (v0.2)
The individual colleagues (OCs and managers) will have seperate non-elevated roles now. So in addition to coordinator and frontdesk, the two new roles will be:
- Optical Consultant
- Assistant Manager

We can ignore v0.2 now as this section will be updated later.