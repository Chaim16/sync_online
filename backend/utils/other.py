import os
import re

import yaml

from utils.constains import PROJECT_HOME


def read_yaml_config(file_path=os.path.join(PROJECT_HOME, "conf", "application.yaml")):
    with open(file_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
        return config


def normalize_agent_name(name: str) -> str:
    # 把非字母数字下划线的字符替换成下划线
    normalized = re.sub(r'\W+', '_', name)
    return normalized

