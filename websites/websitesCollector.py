import os
import shutil

import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from tranco import Tranco


def get_domain_category(drive, url):
    URL = f"https://sitelookup.mcafee.com/en/feedback/url?action=checksingle&url={url}"

    drive.get(URL)
    try:
        WebDriverWait(drive, 10).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[1]/div[3]/div[2]/div[2]/div/div/div/div[2]/div["
                                                      "1]/div/form[1]/table/tbody/tr[4]/td/div/input"))
        ).click()
        element = WebDriverWait(drive, 10).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[1]/div[3]/div[2]/div[2]/div/div/div/div[2]/div["
                                                      "1]/div/form[2]/table/tbody/tr[2]/td[4]"))
        )
    except Exception as e:
        print(f"Error waiting for element: {e}")
        return None

    return [cat.strip() for cat in element.text.replace("-", "").split("\n")]

def is_live(site: str, timeout=5):
    """Return True if https://<site> answers with a <400 status."""
    try:
        res = requests.get(f"https://{site}", timeout=timeout, allow_redirects=True)
        # print(f"Status code: {res.status_code}")
        return res.status_code
    except requests.RequestException:
        return 0

if __name__ == "__main__":
    options = Options()
    options.add_argument("--disable-blink-features=AutomationControlled")
    driver = webdriver.Chrome(options=options)
    driver.maximize_window()

    shutil.rmtree("websites/.tranco", ignore_errors=True)

    t = Tranco(cache=True, cache_path="websites/tranco_cache")
    tranco_name = t.list(full=True).list_id

    done_websites = []
    try:
        with open(f".tranco/{tranco_name}.csv", "r+", encoding="utf-8") as f:
            tranco_domains = f.readlines()
            print(f"[-] Found {len(tranco_domains)} domains")

        if not os.path.exists(f"./Tranco-categorizer.csv"):
            with open(f"./Tranco-categorizer.csv", "w", encoding="utf-8") as f:
                f.write("domain,categories\n")
                print("[+] Created Tranco-categorizer.csv file")

        with open(f"./Tranco-categorizer.csv", "r+", encoding="utf-8") as f:
            concat_domains = [x.split("\n")[0].split(',')[0] for x in f.readlines()][1:]
            print(f"[-] {len(concat_domains)} domains already categorized")

        with open("Tranco-categorizer.csv", "a+", encoding="utf-8") as f:
            print("[+] categorizing websites...")
            record = ""

            counter = 0
            print(f"[+] {len(concat_domains)} domains categorized")
            for domain in tranco_domains:
                done_websites.append(domain)
                domain = domain.split(",")[1].split("\n")[0]
                if domain in concat_domains:
                    print(f"[-] Skipping {domain}")
                    continue

                counter += 1
                domain = domain.strip()
                cats = get_domain_category(driver, domain) or []
                cleaned_cats = "|".join(cats).replace("||", "|")
                if cleaned_cats.startswith("|"):
                    cleaned_cats = cleaned_cats[1:]
                f.write(f"{domain},{cleaned_cats}\n")
                print(f"[+] {counter}: {domain}")
                if counter % 1000 == 0:
                    q = input("[?] Wanna stop categorizing?: ")
                    if q == "y":
                        break
    except Exception as e:
        print(f"[!] Exception: {e}")
    except KeyboardInterrupt:
        print("\n[!] Interrupted by user.")
    finally:
        with open(f".tranco/{tranco_name}.csv", "w", encoding="utf-8") as f:
            l = [i for i in tranco_domains if i not in done_websites[:-1]]
            f.writelines(l)
        driver.close()
        print("[x] Process Finished.")
