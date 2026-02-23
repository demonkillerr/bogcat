# v0.1.1
- Intialised project repository with monorepo (turbo)
- Setup database schema with prisma
- Setup basic frontend and backend
- Test frontend and backend together

# v0.1.2
- Setup CI with Github Actions
- Added a CHANGELOG file (this file)

# v0.1.3
- Allow admin to view/edit dashboards and information regardless of time.
- Allow admin to do what the coordinator can do regardless of time restrictions.
- Allow the admin to see who is logged in, and log a person out.
- Allow admin to add users and assign roles to them (OC or Manager)

# 0.1.4
- FIX: When coordinator or admin adds all team members working today, a refresh is required to show them in task board. This should happen in real time.
- Admin should be able to see a dashboard of the whole week (planned)
- Admin should be able to edit/add tasks that can be assigned. (Handover after ST)

# 0.1.5
- Integrate a setting's tab for admin

# 0.1.6
- Improve frontdesk functionality and page
- Change date format from mm/dd/yyyy to dd/mm/yyyy
- Make updates on frontend real time, synced with coordinator and admin
- Allow frontdesk to write small notes

# v0.2.0 (iterate in 0.2.x for this)
- Add new entity, optoms and integrate with the coordinator's workflow
- Allow optoms to call for post checks or dispense
- Notify coordinator to send correct person to optom's room (simillar to front desk)
- Allow optoms to write small notes

More things to add:
1) Lunch break scheduling for all colleagues working (coordinator and admin's account)
2) EGOS status for future days
3) Scan/File Pull Status for future days
4) Accounts for all colleagues, and eventual change in password (and allow admin dashboard to change that)
5) Eliminate need to maintain excel sheet
    - optomap/oct tracker
    - dashboards for the day