import FinanceDataReader as fdr
import pandas as pd

df_krx = fdr.StockListing('KRX')
pd.core.frame.DataFrame


print(df_krx.head())
print(len(df_krx))