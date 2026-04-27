# static-site-ts: דוגמת TypeScript ל-rivarts

## איך להריץ

1. ודא שקומפלת את הקוד:
   - בתיקיה זו, הרץ:
     ```
       npx tsc -p tsconfig.json
     ```
   - יווצר הקובץ DrugAdministration.js (ES module).

2. ודא שב-dist של rivarts קיימים הקבצים:
   - index.js, Signal.js, RIVar.js וכו' (ה-build של rivarts)

3. פתח את הקובץ:
   - `DrugAdministration.html`
   - אפשר לגרור לדפדפן או לפתוח ישירות (אין צורך בשרת).

4. אם יש שגיאות, בדוק את הקונסול של הדפדפן.

## הערות
- כל הקוד ב-DrugAdministration.js הוא ES module (import/export), אין require/exports.
- אפשר לערוך את DrugAdministration.ts ולבצע קומפילציה מחדש בכל שינוי.
