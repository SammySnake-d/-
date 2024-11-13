import deepl


auth_key = "d0dcdf3e-738d-4da6-bc4d-e956b544991f"  # Replace with your key
translator = deepl.Translator(auth_key)

result = translator.translate_text("你好", target_lang="EN-US")
print(result.text)  # "Bonjour, le monde !"