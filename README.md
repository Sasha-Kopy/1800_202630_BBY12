# PaceMoney


## Overview
PaceMoney is a client-side JavaScript web application that helps people stay on top of their spending. Users create a personalized budget based on their income, set a daily spending limit and a savings goal, log their expenses, and see at a glance whether they are on track for the day.

Developed for the COMP 1800 course, this project applies User-Centred Design practices and agile project management, and demonstrates integration with Firebase backend services for authentication and data storage.

---


## Features

- Sign up, log in, and log out with email and password
- Set a daily expense limit and a target savings goal
- Log expenses with a description, amount, and date, and delete them again
- "Today's Budget Status" card on the home page: within budget, approaching the limit (80%), or over the limit
- Responsive design for desktop and mobile

---


## Technologies Used

- **Frontend**: HTML, CSS, JavaScript, [Bootstrap 5](https://getbootstrap.com/) and [Bootstrap Icons](https://icons.getbootstrap.com/)
- **Build Tool**: [Vite](https://vitejs.dev/) (multi-page build)
- **Authentication**: Firebase Authentication (email/password)
- **Database**: Cloud Firestore
- **Hosting**: Firebase Hosting

---


## Usage

To run the application locally:

1.  **Clone** the repository.
2.  **Install dependencies** by running `npm install` in the project root directory.
3.  **Start the development server** by running the command: `npm run dev`.
4.  Open your browser and visit the local address shown in your terminal (usually `http://localhost:5173` or similar).

Once the application is running:

1.  Click **Sign Up** to create an account, or **Log In** if you already have one.
2.  Open **Settings** and set your daily expense limit and savings goal.
3.  Open **Dashboard** and add the expenses you make during the day.
4.  Return to the **Home** page to see your budget status for today.

### Firebase setup (first time only)

1.  In the [Firebase console](https://console.firebase.google.com/), enable **Authentication > Email/Password** and create a **Firestore** database.
2.  Put your project's web config in `src/firebaseConfig.js`.
3.  Publish the security rules so users can only read and write their own data: `firebase deploy --only firestore:rules`.

### Build and deploy

1.  `npm run build` creates the production site in `dist/`.
2.  `firebase deploy --only hosting` publishes it.

> Every new page needs its own `.html` file **and** an entry in `build.rollupOptions.input` in `vite.config.js`, otherwise it will be missing from the production build.

---


## Data Model

```
users/{uid}                       dailyExpenseLimit, savingsGoal, updatedAt
users/{uid}/transactions/{id}     description, amount, date (local YYYY-MM-DD), createdAt
```

Amounts are stored in dollars but added and compared in whole cents (see `src/money.js`) to avoid floating-point rounding errors.

---


## Project Structure

```
pacemoney/
├── src/
│   ├── authentication.js   (Firebase Auth helpers and error messages)
│   ├── dashboard.js        (add, list, and delete expenses)
│   ├── firebaseConfig.js   (Firebase setup: auth and db)
│   ├── home.js             (today's budget status card)
│   ├── login.js
│   ├── main.js             (home page: login state and logout)
│   ├── money.js            (cents and local-date helpers)
│   ├── settings.js         (daily limit and savings goal)
│   └── signup.js
├── images/
├── dashboard.html
├── index.html
├── login.html
├── settings.html
├── signup.html
├── firebase.json
├── firestore.rules
├── package.json
├── vite.config.js
├── README.md
```

---


## Contributors
- Sasha Kopytok - BCIT CST Student who likes cooking and sports. Fun fact: Loves to play volleyball and ride motorcycles.
- Marco Tellez - BCIT CST Student who enjoys going on hikes and spending time with friends. Fun Fact: Makes a mean bolognese sauce
- Carlos Arevalo - A BCIT CST Student with a passion for outdoor adventures and user-friendly applications. Fun fact: I play the Reti opening as white in Chess.

---


## Acknowledgments

- Code snippets were adapted from resources such as [Stack Overflow](https://stackoverflow.com/) and [MDN Web Docs](https://developer.mozilla.org/).
- Icons from [Bootstrap Icons](https://icons.getbootstrap.com/).

---


## Limitations and Future Work
### Limitations

- The Savings and Budget pages are not built yet (they appear disabled in the navigation).
- Expenses have no categories, and a day's total is the only summary.
- Accessibility features can be further improved.

### Future Work

- Savings page showing progress toward the savings goal.
- Budget page with monthly budgets based on income and fixed monthly expenses (rent, groceries).
- Charts of spending over time.
- Expense categories, plus editing existing expenses.
- Dark mode for better usability in low-light conditions.

---


## License

This project is licensed under the MIT License. See the LICENSE file for details.
