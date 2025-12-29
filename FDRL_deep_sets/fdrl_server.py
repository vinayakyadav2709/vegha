import torch
import copy


class FDRLServer:
    """Central server for Federated Deep Reinforcement Learning."""

    def __init__(self, baseline_model):
        self.global_model = copy.deepcopy(baseline_model)
        self.global_weights = self.global_model.state_dict()
        self.round_count = 0

    def aggregate(self, client_weights_list):
        """
        Aggregates weights from multiple clients with outlier detection.
        Uses adaptive outlier threshold that relaxes over time.
        """
        if not client_weights_list:
            return self.global_weights

        print(f">> Aggregating weights from {len(client_weights_list)} agents...")

        new_weights = copy.deepcopy(client_weights_list[0])
        for k in new_weights.keys():
            new_weights[k] = torch.zeros_like(new_weights[k], dtype=torch.float32)

        # Adaptive threshold: Start strict, relax over time
        outlier_threshold = max(0.1, 0.3 - (self.round_count * 0.01))

        for key in self.global_weights.keys():
            layer_stack = torch.stack(
                [client[key].float() for client in client_weights_list]
            )

            # Use median for robustness (better than mean for outliers)
            median_w = torch.median(layer_stack, dim=0)[0]
            std_w = torch.std(layer_stack, dim=0)

            factors = []
            for client_w in layer_stack:
                distance = torch.abs(client_w - median_w)
                outlier_mask = distance > (1.5 * (std_w + 1e-6))
                outlier_ratio = torch.sum(outlier_mask).item() / torch.numel(client_w)

                if outlier_ratio > outlier_threshold:
                    factors.append(0.5)
                else:
                    factors.append(1.0)

            # Normalize
            total_factor = sum(factors)
            factors = [f / total_factor for f in factors]

            # Weighted sum
            weighted_sum = torch.zeros_like(median_w)
            for i, client_w in enumerate(layer_stack):
                weighted_sum += factors[i] * client_w

            new_weights[key] = weighted_sum

        self.global_weights = new_weights
        self.round_count += 1
        return self.global_weights

    def get_global_weights(self):
        return self.global_weights

    def save_model(self, path="global_model.pth"):
        torch.save(self.global_weights, path)
        print(f">> Global Model saved to {path}")

    def load_model(self, path="global_model.pth"):
        self.global_weights = torch.load(path)
        print(f">> Global Model loaded from {path}")
        return self.global_weights
