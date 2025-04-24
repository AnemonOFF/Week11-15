# Food Journal App

A React Native application for tracking food entries with image and category support.

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

## REPORT: Fixed Issues

### Database Executions

**Issue:** Runtime error `TypeError: Cannot read property 'execAsync' of undefined`

**Cause:** The application was using undefined prop in callback of withTransactionAsync method.

**Solution:** Using db object instead of undefined 'tx'

### Auth database executions

**Issue:** TypeError: Cannot read property 'rows' of undefined

**Cause:** function in database.js is not returning result of execution

**Solution:** Rewrite it to use runAsync method (for modification queries) and create another function to select queries. Additionally update authScreen to specify this changes.

### Button not exist

**Issue:** Property Button does not exist

**Solition:** Import Button component from react-native

### Camera view object

**Issue:** type is invalid -- expected a string

**Solution:** Use CameraView component instead of Camera object in render

### Scroll

**Issue:** No scrolling on home page

**Solution:** Add ScrollView wrapper

### Fix UI

**Issue:** hidden buttons overflow swipeview

**Solution:** add padding and margins

### Scroll warning

**Issue:** VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead.

**Solution:** Disable scroll on SwipeListView (w/ scrollEnabled={false} prop) to prevent double scroll area

## REPORT: Extends

### Meal rating

Added rating to meal, you can rate it with 1-5 stars.
Also you can see rating in journal.

### Search bar

Added search bar, so journal will show only meals, whose description contains searching value.

### Stats

Added stats button on top of view. Inside of it you can see number of meals for each category and average rating of meals.

### Category colors

Now, here is specific colors for each category. They got colored in journal and stats sections.
