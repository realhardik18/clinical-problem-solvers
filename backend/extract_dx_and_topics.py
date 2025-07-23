import json
import csv
import datetime
def mmddyy(date_list):
    """Convert ['Month', 'day', 'year'] list to mm/dd/yy string."""
    months = {'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
              'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'}
    month = months.get(date_list[0], '00')
    day = date_list[1].zfill(2)
    year = date_list[2][-2:]
    return f"{month}/{day}/{year}"

def extract_dx_and_topics():
    with open('video-data.json', 'r') as file:
        data = json.load(file)

    # Read padded.csv and store rows by date
    csv_rows = {}
    with open('padded.csv', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # Assume the date column is named 'Date' and is in mm/dd/yy format
            csv_rows[row['Date']] = row

    output = {}
    for entry in data:
        title = data[entry]['title']
        url = data[entry].get('url', entry)
        date_str = mmddyy(title.replace(',', '').split()[:3])
        row = csv_rows.get(date_str)
        if row:
            # Find index of 'Final Dx' and 'Topics' columns
            fieldnames = reader.fieldnames
            final_dx_idx = fieldnames.index('Final Dx')
            topics_idx = fieldnames.index('Topics')
            # Extract Final Dx and all columns after Topics
            value = {
                'Final Dx': row['Final Dx'], 
                'Topics' : row['Topics'],
                'Chief Complaint': row['Chief Complaint'],
                "slide":row["Filename"]
                               
            }
            print(row.keys())
            output[url] = value

    with open('url_dx_topicss.json', 'w', encoding='utf-8') as outfile:
        json.dump(output, outfile, indent=2)

if __name__ == '__main__':
    extract_dx_and_topics()