---
name: Bug report
about: Template to report data ingestion / processing problems
title: ''
labels: bug
assignees: Conal-Tuohy

---

### 1 Describe the problem

Provide a clear and concise explanation of the problem and then save the issue to get the issue id.

```
Example:

Excessive tei markup is not being removed from Bates34-tei.xml 
(generated from word doc via oxgarage).
```

Save the issue to get the id:

```
#67
```

### 2. Create the test case in drive

Create a test case with the relevant data file in drive. If there's a suitable top level classification then create a new test case inside it. If not, create a top level classification first. Test cases should be in their own folder - even if there's only example.

Name the folders as: `${item identifier} - github ${github id}`

```
Example:

|_ Issue - excessive tei markup (folder)
  |_ Bates 34 - github #67 (folder)
    |_ Bates34-tei.xml (test file)
    |_ Bates34-tei.docx (original file)
```

* Each test case should have one or at most a few relevant examples
  * tei ingestion problem : add the word doc and tei file produced by oxgarage
  * image processing problem: one or two examples
* Create a new folder for each test case 
* There should not be more than two levels of nesting

### 3. Update the issue with a link to the test case

Edit the issue and put a link to the test data folder as follows:

```
[Issue - excessive tei markup/Bates34 - github #67](link to folder in drive)
```
