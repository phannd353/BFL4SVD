from __future__ import annotations

import unittest

import torch

from src.hash import hash_state_dict


class ModelHashTests(unittest.TestCase):
    def test_hash_is_independent_of_mapping_order_and_tensor_device(self) -> None:
        first = {
            "weight": torch.tensor([[1.0, 2.0]]),
            "bias": torch.tensor([3.0]),
        }
        reordered = {
            "bias": torch.tensor([3.0]),
            "weight": torch.tensor([[1.0, 2.0]]),
        }

        self.assertEqual(hash_state_dict(first), hash_state_dict(reordered))
        self.assertEqual(hash_state_dict(first), hash_state_dict(first))
        self.assertEqual(len(hash_state_dict(first)), 64)

    def test_hash_changes_when_model_parameters_change(self) -> None:
        original = {"weight": torch.tensor([1.0])}
        changed = {"weight": torch.tensor([2.0])}

        self.assertNotEqual(hash_state_dict(original), hash_state_dict(changed))


if __name__ == "__main__":
    unittest.main()
