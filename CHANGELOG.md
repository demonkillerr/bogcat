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

# v0.1.3
- FIX: When coordinator or admin adds all team members working today, a refresh is required to show them in task board. This should happen in real time.
- Admin should be able to see a dashboard of the whole week (planned)
- Admin should be able to edit/add tasks that can be assigned. (Handover after ST)
- Admin settings panel

# v0.1.4
- FIX: When coordinator or admin adds all team members working today, a refresh is required to show them in task board. This now happens in real time.
- Allow admin to add/remove/edit colleague's role from a setting's tab
- Add another role - senior OC. This allows coordinator and admin to assign dispensing tasks to senior OCs.

# v0.1.5
- Allow admin and coordinator to assign lunch breaks (12:30PM to 2:30PM)
- Allow admin to see weekly statistics from the new statistics tab

# v0.1.6
- Added a new script for building and running the entire program
- Week runs from Sunday to Monday now for statistics tab

# v0.1.7
- Add frontdesk's view to admin's dashboard.
- Give frontdesk real time updates applied by admin or coordinator
- Remove date-of-birth field from entire codebase, replace it with optional notes.

# v0.2.0
- Add new entity, optometrists
- Allow optoms to call for post checks or dispense

# v0.2.1
- Update admin's optom page to manage optom's rooms
- Allow optoms to enter their name once they arrive
- How can optoms login (multiple accounts?)

# v0.2.2
- Allow optoms to call for multiple things (post checks + dispense)
- Simplify optom's page and replace today's calls with a short optional note textbox
- Create 4 login accounts for optoms based on room number