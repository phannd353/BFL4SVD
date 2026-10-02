split-niid:
	python3 split_federated_dataset.py \
      --input data/raw/dataset.json \
      --output-dir data/federated \
      --mode non-iid \
      --seed 42

split-iid:
	python3 split_federated_dataset.py \
      --input data/raw/dataset.json \
      --output-dir data/federated \
      --mode iid \
      --seed 42

build-vocab:
	# max 53752 tokens
	python3 export_vocabulary.py \
      --data data/federated/iid/server/test.json \
      --output data/federated/vocabulary.json \
      --max-vocab-size 20000
